PAR_ID=$1

export PHONEMIZER_ESPEAK_LIBRARY="/opt/homebrew/Cellar/espeak-ng/1.52.0/lib/libespeak-ng.dylib"
export ESPEAK_DATA_PATH="/opt/homebrew/Cellar/espeak-ng/1.52.0/share/espeak-ng-data"
python -m models.tts.maskgct.maskgct_inference_ref1gen3_random_addnoise --par-id $PAR_ID >> dryrun_maskgct.txt
