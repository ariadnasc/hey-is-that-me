# Copyright (c) 2024 Amphion.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# Modified for the purposes of our demo in 2025

import time
start = time.time()

import os
import argparse

from models.tts.maskgct.maskgct_utils import *
from huggingface_hub import hf_hub_download
import safetensors
import soundfile as sf
from pydub import AudioSegment

if __name__ == "__main__":

    WAV_DIR = "/path/to/hey-is-that-me/jspsych_demo/audios"
    NOISE_PATH = "/path/to/background/noise/file.wav"
    BG_NOISE = AudioSegment.from_wav(NOISE_PATH)

    parser = argparse.ArgumentParser("MaskGCT TTS Inference")
    parser.add_argument("--par-id", help="Participant ID", type=str, required=True)
    args = parser.parse_args()
    PAR_ID = args.par_id
    print("Participant ID:", PAR_ID)

    # build model
    # device = torch.device("cuda:0")
    device = torch.device("cpu")
    cfg_path = "./models/tts/maskgct/config/maskgct.json"
    cfg = load_config(cfg_path)
    # 1. build semantic model (w2v-bert-2.0)
    semantic_model, semantic_mean, semantic_std = build_semantic_model(device)
    # 2. build semantic codec
    semantic_codec = build_semantic_codec(cfg.model.semantic_codec, device)
    # 3. build acoustic codec
    codec_encoder, codec_decoder = build_acoustic_codec(
        cfg.model.acoustic_codec, device
    )
    # 4. build t2s model
    t2s_model = build_t2s_model(cfg.model.t2s_model, device)
    # 5. build s2a model
    s2a_model_1layer = build_s2a_model(cfg.model.s2a_model.s2a_1layer, device)
    s2a_model_full = build_s2a_model(cfg.model.s2a_model.s2a_full, device)

    # download checkpoint
    # download semantic codec ckpt
    semantic_code_ckpt = hf_hub_download(
        "amphion/MaskGCT", filename="semantic_codec/model.safetensors"
    )
    # download acoustic codec ckpt
    codec_encoder_ckpt = hf_hub_download(
        "amphion/MaskGCT", filename="acoustic_codec/model.safetensors"
    )
    codec_decoder_ckpt = hf_hub_download(
        "amphion/MaskGCT", filename="acoustic_codec/model_1.safetensors"
    )
    # download t2s model ckpt
    t2s_model_ckpt = hf_hub_download(
        "amphion/MaskGCT", filename="t2s_model/model.safetensors"
    )
    # download s2a model ckpt
    s2a_1layer_ckpt = hf_hub_download(
        "amphion/MaskGCT", filename="s2a_model/s2a_model_1layer/model.safetensors"
    )
    s2a_full_ckpt = hf_hub_download(
        "amphion/MaskGCT", filename="s2a_model/s2a_model_full/model.safetensors"
    )

    from accelerate import load_checkpoint_and_dispatch

    load_checkpoint_and_dispatch(semantic_codec, semantic_code_ckpt, device_map={"": "cpu"})
    load_checkpoint_and_dispatch(codec_encoder, codec_encoder_ckpt, device_map={"": "cpu"})
    load_checkpoint_and_dispatch(codec_decoder, codec_decoder_ckpt, device_map={"": "cpu"})

    load_checkpoint_and_dispatch(t2s_model, t2s_model_ckpt, device_map={"": "cpu"})
    load_checkpoint_and_dispatch(s2a_model_1layer, s2a_1layer_ckpt, device_map={"": "cpu"})
    load_checkpoint_and_dispatch(s2a_model_full, s2a_full_ckpt, device_map={"": "cpu"})

    # inference
    texts = [
        "Afterwards, we went back to the house.",
        "I picked up my shopping and headed up the road.",
        "In his left hand he held the flashlight.",
        "All the land out there had been under water once.",
        "The two women sat in silence for a moment.",
        "I rang the bell, but there was no answer."
        ]

    from random import sample
    rand_idx = sample(range(len(texts)), k=4) # randomly pick 4 indices, 1 for reference, 3 for generation
    ref_idx, gen_idx = rand_idx[0], rand_idx[1:]
    print ("Reference index: {}, Generation indices: {}".format(ref_idx, gen_idx))
    
    prompt_wav_path = os.path.join(WAV_DIR, "recording_{}_sentence_{}.wav".format(PAR_ID, ref_idx+1))
    prompt_text = texts[ref_idx]

    for i in gen_idx:
        inference_start = time.time()
        save_path = os.path.join(WAV_DIR, "cloned_{}_sentence_{}.wav".format(PAR_ID, i+1))
        target_text = texts[i]
        
        # Specify the target duration (in seconds). If target_len = None, we use a simple rule to predict the target duration.
        target_len = None
        maskgct_inference_pipeline = MaskGCT_Inference_Pipeline(
            semantic_model,
            semantic_codec,
            codec_encoder,
            codec_decoder,
            t2s_model,
            s2a_model_1layer,
            s2a_model_full,
            semantic_mean,
            semantic_std,
            device,
        )

        recovered_audio = maskgct_inference_pipeline.maskgct_inference(
            prompt_wav_path, prompt_text, target_text, "en", "en", target_len=target_len
        )

        sf.write(save_path, recovered_audio, 24000)

        inference_end = time.time()
        print("Time taken to run the inference: {:.2f} seconds".format(inference_end - inference_start))
    
    # Add background noise to the recodings and generated audios
    addnoise_start = time.time()
    for i in range(len(texts)):
        if i in gen_idx:
            wav_path = os.path.join(WAV_DIR, "cloned_{}_sentence_{}.wav".format(PAR_ID, i+1))
            out_wav_path = os.path.join(WAV_DIR, "noise_cloned_{}_sentence_{}.wav".format(PAR_ID, i+1))
        else:
            wav_path = os.path.join(WAV_DIR, "recording_{}_sentence_{}.wav".format(PAR_ID, i+1))
            out_wav_path = os.path.join(WAV_DIR, "noise_recording_{}_sentence_{}.wav".format(PAR_ID, i+1))
        audio_trial = AudioSegment.from_wav(wav_path)
        played_togther = audio_trial.overlay(BG_NOISE - 12)
        file_handle = played_togther.export(out_wav_path, format="wav")
    addnoise_end = time.time()
    print("Total time taken to add noise: {:.2f} seconds".format(addnoise_end - addnoise_start))

    # Final time taken
    end = time.time()
    print("Total time taken: {:.2f} seconds".format(end - start))
