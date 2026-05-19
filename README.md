# Local demo

The folder jspsych_demo contains the code to run the demo locally on a laptop browser (recommended to use Google Chrome).
It is required to install Node.js. To start the local server, you can run:

```
cd jspsych_demo
node server4.js
```

In your browser, you can start localhost:3000 to run the demo. Once you have finished recording samples, the demo will ask you to run TTS inference. Follow the steps in the section below to install the TTS system and run inference.

# Run VC TTS

To run the TTS system and generate synthetic samples, you need to previously install MaskGCT through Amphion. Follow instructions at https://github.com/open-mmlab/amphion, and install Amphion inside this folder (i.e., hey-is-that-me/Amphion)

Once installed, copy .py file and infer.sh file in the Amphion directory, by running these commands:

```
cp maskgct_inference_ref1gen3_random_addnoise.py Amphion/models/tts/maskgct/maskgct_inference_ref1gen3_random_addnoise.py
cp infer.sh Amphion/infer.sh
```

Then, you can run inference by running the following command, where PARTICIPANT_ID is provided by the JsPsych demo:

```
bash infer.sh PARTICIPANT_ID
```

This command runs inference in CPU locally, so it will take a few minutes to do so. Do not continue running the demo until you have completed inference, as it will otherwise fail.
