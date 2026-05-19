/******************************************************************************/
/*** Initialise jspsych *******************************************************/
/******************************************************************************/

var jsPsych = initJsPsych({
  show_progress_bar: true,
});

/* Saving trials incrementally */

function save_data_line(data) {
  // choose the data we want to save - this will also determine the order of the columns
  var data_to_save = [
    data.participant_id,
    data.time_elapsed,
    data.rt,
    data.consent,
    data.confidence_before,
    data.device_id,
    data.response_type,
    data.trial_recording,
    data.trial_why,
    data.trial_answer,
    data.trial_order,
    data.confidence_after,
    data.voice_quality,
    data.accent_quality,
    data.quality_why,
    data.age,
    data.gender,
    data.gender_text,
    data.ethnicity,
    data.ethnicity_text,
    data.hearing_condition,
    data.native_speaker,
    data.first_language,
    data.english_accent,
    data.voice_assistant,
    data.video_usage,
    data.screen_reader,
    data.participant_expertise,
    data.attention
  ];
  // join these with commas and add a newline
  var line = data_to_save.join(",") + "\n";
  return line;
}

// function to create the header
function create_header(outputFile) {
  var write_headers = {
    type: jsPsychCallFunction,
    func: function (data) {
      //write column headers to outputFile
      save_data(
        outputFile, // file name with participant ID
        '"participant_id","time_elapsed","rt","consent","confidence_before",\
        "device_id","response_type","trial_recording","trial_why","trial_answer",\
        "trial_order","confidence_after","voice_quality","accent_quality","quality_why",\
        "age","gender","gender_text","ethnicity","ethnicity_text","hearing_condition","native_speaker",\
        "first_language","english_accent","voice_assistant","video_usage","screen_reader",\
        "participant_expertise","attention"\n'     
      );
    },
  };
  return write_headers
}


/******************************************************************************/
/*** Trials for the study *****************************************************/
/******************************************************************************/

var fullscreen_trial = {
  type: jsPsychFullscreen,
  fullscreen_mode: true
}

var consent_form_trial = {
  type: jsPsychHtmlButtonResponse,
  stimulus:
   "<p> ADD YOUR CONSENT FORM </p>",
    choices: ["I agree"],
    on_finish: function(data){
      // Save output csv
      data.participant_id = participant_id;
      data.consent = "I agree";
      data.response_type = 'consent';
      line = save_data_line(data, outputFile)
      save_data(outputFile, line);
    }
};

var participant_id_trial = {
  type: jsPsychHtmlButtonResponse,
  stimulus: "",
  choices: ["Continue"],
  on_start: function(trial){
    trial.stimulus = "<p> This is your participant ID: <b>" + participant_id + "</b> \
            <p> Please write it down. You will need it in case you want to withdrawn your data in the future. </p>"
  }
};

var likert_scale = [
  "Not confident at all",
  "A little confident",
  "Somewhat confident",
  "Very confident",
  "Extremely confident"
];

var confidence_before_trial = {
  type: jsPsychSurveyLikert,
  questions: [
    {prompt: "How confident are you that you will be able to tell the cloned voice from your real voice?", required: true, name: 'confidence_before', labels: likert_scale}
  ],
  randomize_question_order: false,
  on_finish: function(data){
    // Save output csv
    data.participant_id = participant_id;
    data.confidence_before = data.response.confidence_before
    data.response_type = 'likert';
    line = save_data_line(data, outputFile);
    save_data(outputFile, line);
  }
};

var instructions_recording_trial = {
  type: jsPsychHtmlButtonResponse,
  stimulus: "<p> You will record some samples of yourself so we can clone your voice.</p> \
  <p>This will happen locally, and your audios will be deleted at the end of the study.</p> \
  <p> On the next page you will see a sentence and be asked to record yourself reading it out loud.</p> \
  <p>You can press '<b><i>Start Recording</i></b>' to <u>record yourself</u> reading the sentence.</p> \
  <p>When you are finished you can click '<b><i>Stop Recording</i></b>' to <u>save</u> the recording.</p> \
  <p>If you need <u>to repeat a recording</u> you can Select '<b><i>Record again</i></b>'.</p> \
  <p>Otherwise, when <u>you are happy</u> you can click '<b><i>Continue</i></b>'.</p>",
  choices: ["Continue"],
};

var cloning_instructions_trial = {
  type: jsPsychHtmlButtonResponse,
  stimulus: "",
  choices: ["Continue"],
  enable_button_after: 0,
  on_start: function(trial) {
    trial.enable_button_after = 30000;
    trial.stimulus = "<p><b>Please call over the researcher who was helping you - it's time to create your cloned voice!</b></p>\
            <p> Participant ID: <b>" + participant_id + "</b></p>"
  },
  on_finish: async function(data){
    // Create stimuli order
    filenames = await get_filenames();
    console.log('Safe to use filenames now:', filenames);

    var recordings = filenames.filter(str => str.includes('noise_recording_'));
    var clones = filenames.filter(str => str.includes('noise_cloned_'));

    var names_clones = clones.map(str => str.replace('noise_cloned_', 'noise_recording_'));
    var filtered_recordings = recordings.filter(item => !names_clones.includes(item));

    var combined_list = filtered_recordings.concat(clones);
    var shuffled_list = jsPsych.randomization.repeat(combined_list, 1);

    data.trial_files = shuffled_list;
  }
};

var instructions_listening_trial = {
  type: jsPsychHtmlButtonResponse,
  stimulus: "Now you will listen to some samples of your real voice and some samples of your cloned voice.</p>\
            <p> You will be asked to determine if you are listening to your real voice or a sample of your cloned voice.</p>\
            <p> <b>You can only hear each recording once, so only continue when you are ready and with headphones on.</b></p>\
            <p> You will get to know how many you got right at the end :)</p>",
  choices: ["Continue"],
  enable_button_after: 1000
};

var recording_utterances = [
  {name: "sentence_1", stimulus: "Afterwards, we went back to the house."},
  {name: "sentence_2", stimulus: "I picked up my shopping and headed up the road."},
  {name: "sentence_3", stimulus: "In his left hand he held the flashlight."},
  {name: "sentence_4", stimulus: "All the land out there had been under water once."},
  {name: "sentence_5", stimulus: "The two women sat in silence for a moment."},
  {name: "sentence_6", stimulus: "I rang the bell, but there was no answer."}
]

var shuffled_recordings = jsPsych.randomization.repeat(recording_utterances, 1);

var initialize_microphone_trial = {
  type: jsPsychInitializeMicrophone,
  on_finish: function(data){
    // Save output csv
    data.participant_id = participant_id;
    data.response_type = 'microphone';
    line = save_data_line(data, outputFile);
    save_data(outputFile, line);
  }
}

function create_recordings_trial (inputs, outputFile) {
  var start_recording_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: "<p> Click 'Ready' when you are able to record the next sentence.</p> \
              <p> Read the following sentence out loud: </p> <p><b>" + inputs.stimulus + "</b></p>",
    choices: ["Ready"],
  };

  var record_audio_trial = { // data needs to be converted in python (base 64)
    type: jsPsychHtmlAudioResponse,
      stimulus: "<p>  </p> \
                <p> </p> \
                 <p> Read the following sentence out loud: </p> <p><b>" + inputs.stimulus + "</b></p>",
      recording_duration: 15000,
      done_button_label: 'Stop recording',
      allow_playback: true,
      on_finish: function(data){
        // Save output csv
        data.participant_id = participant_id;
        data.response_type = 'recording';
        line = save_data_line(data, outputFile);
        save_audio(data, line, outputFile, inputs);
      }
  }
  return [start_recording_trial, record_audio_trial];
}

function create_voice_trial(outputFile, trial_order) {
  var voice_trial = {
    type: jsPsychSurvey,
    survey_json: {},
    on_start: function(trial){
      var responses = jsPsych.data.getLastTimelineData();
      var last_response = responses.trials[responses.trials.length - trial_order - 3];
      trial.survey_json = {
        title: ' ',
          elements: [
            {
              type: "html",
              name: "audio-player",
              html: "<audio disabled id='audio' autoplay><source src='" + "audios/" + last_response.trial_files[trial_order-1] + "' type='audio/mp3'></audio>"
            },
            {
              type: 'radiogroup',
              name: "real_voice_question",
              title: 'Is this your real voice?',
              description: ' ',
              choices: ["Yes", "No", "Im not sure"],
              isRequired: true,
              allowClear: false,
            },
            {
              type: 'comment',
              name: 'free_text',
              title: 'Please briefly explain why you chose the answer above.',
              visibleIf: '{real_voice_question} = "No" or {real_voice_question} = "Im not sure"',
              isRequired: true,
            }
          ],
      }
    },
    on_finish: function(data){
      // Load trial files
      var responses = jsPsych.data.getLastTimelineData();
      var last_response = responses.trials[responses.trials.length - trial_order - 4]; // -3 because there is a preload trial and a fullscreen trial
      // Save output csv
      data.participant_id = participant_id;
      data.response_type = 'judgement';
      data.trial_order = trial_order;
      data.trial_recording = last_response.trial_files[trial_order-1];
      data.trial_answer = data.response.real_voice_question;
      if (data.trial_answer !== 'Yes') {
        data.trial_why = data.response.free_text.replaceAll(",", ";");
      }
      if (trial_order === 1) {
        if (data.trial_recording.includes('noise_recording_') & data.response.real_voice_question === 'Yes') {
          data.correct_answers = 1;
        } else if (data.trial_recording.includes('noise_cloned_') & data.response.real_voice_question === 'No') {
          data.correct_answers = 1;
        } else {
          data.correct_answers = 0;
        }
      } else {
        var responses = jsPsych.data.getLastTimelineData();
        var last_response = responses.trials[responses.trials.length - 2];
        if (data.trial_recording.includes('noise_recording_') & data.response.real_voice_question === 'Yes') {
          data.correct_answers = last_response.correct_answers + 1;
        } else if (data.trial_recording.includes('noise_cloned_') & data.response.real_voice_question === 'No') {
          data.correct_answers = last_response.correct_answers + 1;
        } else {
          data.correct_answers = last_response.correct_answers;
        }
      }
      line = save_data_line(data, outputFile);
      save_data(outputFile, line);
    }
  };
  
  return voice_trial;
}

var correct_trial = {
  type: jsPsychHtmlButtonResponse,
  stimulus: "",
  choices: ["Continue"],
  on_start: function(trial) {
    var responses = jsPsych.data.getLastTimelineData();
    var last_response = responses.trials[responses.trials.length - 1];
    trial.stimulus = "<p> You got a total of <b>" + last_response.correct_answers + " answers correct</b> out of the 6 trials you have completed.</p>\
                      <p><b> Click Continue when you are ready to answer some further questions about the cloned voice and about yourself.</b></p>"
  }
}

var why_trial = {
  type: jsPsychSurveyText,
  questions: [],
  on_start: function(trial){
    var responses = jsPsych.data.getLastTimelineData();
    var last_response = responses.trials[responses.trials.length - 1];
    choices = {
      0: "Yes",
      1: "No",
      2: "I'm not sure"
    }
    trial.questions = [
      {prompt: '<p><b>Please briefly explain why you chose that answer on the previous page.</b> You can find your previous answer below.</p> \
                <p>Previous answer: ' + choices[last_response.response] + '</p>', required: true, name: 'why_answer', rows: 10, required: true
      }
    ]
  },
  on_finish: function(data){
    // Save output csv
    data.participant_id = participant_id;
    line = save_data_line(data, outputFile);
    save_data(outputFile, line);
  }
};

var confidence_after_trial = {
  type: jsPsychSurveyLikert,
  questions: [
    {prompt: "How confident are you that you will be able to tell the cloned voice from your real voice in the future?", required: true, name: 'confidence_after', labels: likert_scale}
  ],
  randomize_question_order: false,
  on_finish: function(data){
    // Save output csv
    data.participant_id = participant_id;
    data.response_type = 'likert';
    data.confidence_after = data.response.confidence_after;
    line = save_data_line(data, outputFile);
    save_data(outputFile, line);
  }
};

var likert_scale_2 = [
  "Not at all",
  "Very little",
  "Somewhat well",
  "Fairly well",
  "Very much"
];

accent_accuracy_json = {
  title: 'Please answer the following questions:', 
  pages: [
    {
      elements: [
        {
          type: 'matrix',
          name: 'quality_scale',
          title: ' ',
          isAllRowRequired: true,
          rows: [
            {text: 'How well do you think the cloned voice captured your normal speaking rhythm?', value: 'voice_quality'},
            {text: 'How well do you think the cloned voice represented your accent?', value: 'accent_quality'}
          ],
          columns: [
          {
            "value": 1,
            "text": "Not at all"
          },
          {
            "value": 2,
            "text": "Very little"
          }, 
          {
            "value": 3,
            "text": "Somewhat well"
          },
          {
            "value": 4,
            "text": "Fairly well"
          },
          {
            "value": 5,
            "text": "Very much"
          },]
        },
        {
          type: 'comment',
          name: 'free_text',
          title: '\n Why did you indicate those answers?',
          isRequired: true
        }
      ]
    }
  ],
};

const accent_accuracy_trial = {
  type: jsPsychSurvey,
  survey_json: accent_accuracy_json,
  on_finish: function(data){
    // Save output csv
    data.participant_id = participant_id;
    data.response_type = 'likert';
    data.voice_quality = data.response.quality_scale.voice_quality;
    data.accent_quality = data.response.quality_scale.accent_quality;
    data.quality_why = data.response.free_text.replaceAll(",", ";");
    line = save_data_line(data, outputFile);
    save_data(outputFile, line);
  }
};

var why_answer_trial = {
  type: jsPsychSurveyText,
  required: true,
  questions: [],
  on_start: function(trial){
    var responses = jsPsych.data.getLastTimelineData();
    var last_response = responses.trials[responses.trials.length - 1];
    choices = {
      0: "Not at all",
      1: "Very little",
      2: "Somewhat well",
      3: "Fairly well",
      4: "Very much"
    }
    trial.questions = [
      {prompt: '<p><b>Why did you indicate those answers?</b> You can find your given answers below </p> \
                <p>Previous answer (voice quality): ' + choices[last_response.response.voice_quality] + '</p> \
                <p>Previous answer (accent quality): ' + choices[last_response.response.accent_accuracy] + '</p>', required: true, name: 'why_accent_answer', rows: 10, required: true
      }
    ]
  },
};

var demographics_trials = []

var demographics_trial_1 = {
  type: jsPsychSurveyHtmlForm,
  html: "<p style='text-align:left;margin-left:5em;margin-right:5em'>What is your age? <br> \
              <input required name='age' type='number' min='18' max='99'></p> \
         <p style='text-align:left;margin-left:5em;margin-right:5em'>What is your gender? <br> \
            <input required type='radio' name='gender' value='Man'>Man<br>\
            <input required type='radio' name='gender' value='Woman'>Woman<br> \
            <input required type='radio' name='gender' value='Non binary | Third gender'>Non-binary / third gender<br> \
            <input required type='radio' name='gender' value='Agender'>Agender<br> \
            <input required type='radio' name='gender' value='Other'>Let me type...<br> \
            <textarea name='gender_free_response'rows='1' cols='20'></textarea><br> \
            <input required type='radio' name='gender' value='Prefer not to say'>Prefer not to say<br></p> \
         <p style='text-align:left;margin-left:5em;margin-right:5em'> What is your ethnicity? <br> \
            <input required type='radio' name='ethnicity' value='White | Caucasian | Anglo'>White, Caucasian, Anglo<br>\
            <input required type='radio' name='ethnicity' value='Black | African | Caribean'>Black, African, Caribean<br> \
            <input required type='radio' name='ethnicity' value='East Asian'>East Asian<br> \
            <input required type='radio' name='ethnicity' value='South Asian'>South Asian<br> \
            <input required type='radio' name='ethnicity' value='West Asian'>West Asian<br> \
            <input required type='radio' name='ethnicity' value='Middle Eastern | Arab'>Middle Eastern, Arab<br> \
            <input required type='radio' name='ethnicity' value='Hispanic | Latinx/a/o | Chicanx/a/o'>Hispanic, Latinx/a/o, Chicanx/a/o<br> \
            <input required type='radio' name='ethnicity' value='Aboriginal'>Aboriginal<br> \
            <input required type='radio' name='ethnicity' value='Native American | Alaska Native'>Native American or Alaska Native<br> \
            <input required type='radio' name='ethnicity' value='Native Hawaiian | Other Pacific Islander'>Native Hawaiian or other Pacific Islander<br> \
            <input required type='radio' name='ethnicity' value='Mixed | Multiple Ethnic Groups'>Mixed or Multiple Ethnic Groups<br> \
            <input required type='radio' name='ethnicity' value='other'>Let me type...<br> \
            <textarea name='ethnicity_free_response'rows='1' cols='20'></textarea><br> \
            <input required type='radio' name='ethnicity' value='Prefer not to say'>Prefer not to say<br></p> \
          <p style='text-align:left;margin-left:5em;margin-right:5em'>Do you have any known hearing conditions (e.g. tinnitus, required hearing aids, etc.)?<br> \
            <input required type='radio' name='hearing_condition' value='Yes'>Yes<br>\
            <input required type='radio' name='hearing_condition' value='No'>No<br> \
            <input required type='radio' name='hearing_condition' value='Prefer not to say'>Prefer not to say<br> \
          <p style='text-align:left;margin-left:5em;margin-right:5em'>Are you a native English speaker?<br> \
            <input required type='radio' name='native_speaker' value='Yes'>Yes<br>\
            <input required type='radio' name='native_speaker' value='No'>No<br></p>",
  on_finish: function(data){
    // Save output csv
    data.participant_id = participant_id;
    data.response_type = 'demographics';
    data.age = data.response.age;
    data.gender = data.response.gender;
    data.gender_text = data.response.gender_free_response.replaceAll(",", ";");
    data.ethnicity = data.response.ethnicity;
    data.ethnicity_text = data.response.ethnicity_free_response.replaceAll(",", ";");
    data.hearing_condition = data.response.hearing_condition;
    data.native_speaker = data.response.native_speaker;
    line = save_data_line(data, outputFile);
    save_data(outputFile, line);
  }
};

demographics_trials.push(demographics_trial_1);
var demographics_trial_2 = {
  type: jsPsychSurveyHtmlForm,
  html: "",
  on_start: function(trial){
    var responses = jsPsych.data.getLastTimelineData();
    var last_response = responses.trials[responses.trials.length - 1];
    if (last_response.response.native_speaker == 'Yes'){
      trial.html = "<p style='text-align:left;margin-left:5em;margin-right:5em'> How would you describe your accent? e.g., 'Scottish', 'New York' (Optional) <br> \
              <textarea name='accent_description'rows='10' cols='60'></textarea></p>"
    } else {
      trial.html = "<p style='text-align:left;margin-left:5em;margin-right:5em'> What is your first language? (Optional) <br> \
          <textarea name='first_language'rows='10' cols='60'></textarea></p>"
    }
  },
  on_finish: function(data){
    // Save output csv
    data.participant_id = participant_id;
    data.response_type = 'demographics';
    var responses = jsPsych.data.getLastTimelineData();
    var last_response = responses.trials[responses.trials.length - 2];
    if (last_response.response.native_speaker == 'Yes'){
      data.english_accent = data.response.accent_description.replaceAll(",", ";");
    } else {
      data.first_language = data.response.first_language.replaceAll(",", ";");
    }
    line = save_data_line(data, outputFile);
    save_data(outputFile, line);
  }
  };
demographics_trials.push(demographics_trial_2);

var tts_usage_trial = {
  type: jsPsychSurveyHtmlForm,
  html: "<p style='text-align:left;margin-left:5em;margin-right:5em'>How often do you use a voice assistant/smart speaker (e.g. Siri, Alexa, Google Assistant)? <br> \
            <input required type='radio' name='voice_assistant_usage' value='Every day'>Every day<br>\
            <input required type='radio' name='voice_assistant_usage' value='At least once a week'>At least once a week<br> \
            <input required type='radio' name='voice_assistant_usage' value='At least once a month'>At least once a month<br> \
            <input required type='radio' name='voice_assistant_usage' value='Occasionally'>Occasionally<br> \
            <input required type='radio' name='voice_assistant_usage' value='Never'>Never<br></p> \
         <p style='text-align:left;margin-left:5em;margin-right:5em'>How often do you use video-based social media (e.g. TikTok, Instagram Reels, YouTube)? <br> \
            <input required type='radio' name='video_usage' value='Every day'>Every day<br>\
            <input required type='radio' name='video_usage' value='At least once a week'>At least once a week<br> \
            <input required type='radio' name='video_usage' value='At least once a month'>At least once a month<br> \
            <input required type='radio' name='video_usage' value='Occasionally'>Occasionally<br> \
            <input required type='radio' name='video_usage' value='Never'>Never<br></p> \
         <p style='text-align:left;margin-left:5em;margin-right:5em'>How often do you use a screen reader? (e.g. for visual impairment or dyslexia) <br> \
            <input required type='radio' name='screen_reader_usage' value='Every day'>Every day<br>\
            <input required type='radio' name='screen_reader_usage' value='At least once a week'>At least once a week<br> \
            <input required type='radio' name='screen_reader_usage' value='At least once a month'>At least once a month<br> \
            <input required type='radio' name='screen_reader_usage' value='Occasionally'>Occasionally<br> \
            <input required type='radio' name='screen_reader_usage' value='Never'>Never<br></p>\
          <p style='text-align:left;margin-left:5em;margin-right:5em'>I am a...<br> \
            <input required type='radio' name='participant_expertise' value='Speech scientist'>Speech scientist<br>\
            <input required type='radio' name='participant_expertise' value='Member of the public'>Member of the public<br></p>",
  on_finish: function(data){
    // Save output csv
    data.participant_id = participant_id;
    data.response_type = 'tts_usage';
    data.voice_assistant = data.response.voice_assistant_usage;
    data.video_usage = data.response.video_usage;
    data.screen_reader = data.response.screen_reader_usage;
    data.participant_expertise = data.response.participant_expertise;
    line = save_data_line(data, outputFile);
    save_data(outputFile, line);
  }
};

var serious_trial = {
  type: jsPsychSurveyHtmlForm,
  html: "<p style='text-align:left;margin-left:5em;margin-right:5em'>Please be honest when answering the following question. Your answer will not affect your eligibility for future studies. \
            Your responses to surveys like this one are an incredibly valuable source of data for researchers. \
            It is therefore crucial for research that participants pay attention, avoid distractions, and take all study tasks seriously (even when they might seem silly).</p> \
         <p style='text-align:left;margin-left:5em;margin-right:5em'>Do you feel that took this survey seriously? <br> \
            <input required type='radio' name='attention' value='No, I did not take this survey seriously'>No, I did not take this survey seriously<br>\
            <input required type='radio' name='attention' value='Yes'>Yes<br>",
  on_finish: function(data){
    // Save output csv
    data.participant_id = participant_id;
    data.response_type = 'attention';
    data.attention = data.response.attention.replaceAll(",", ";");
    line = save_data_line(data, outputFile);
    save_data(outputFile, line);
  }
};

var final_screen = {
  type: jsPsychHtmlButtonResponse,
  stimulus: "",
  choices: ["Finish"],
  on_start: function(trial){
    trial.stimulus = "<p> Thank you for your participation! </p> \
            <p> If you want to withdraw your data in the future, ensure you keep the following ID: <b>" + participant_id + "</b> \
            <p> Take a photo of it now for that purpose, or write it down. </p> \
            <p> <b>You can now call over the researcher who was helping you.</b> </p>"
  },
  on_finish: function(data){
    // Delete audios automatically (uncomment delete_audios();)
    data.participant_id = participant_id;
    //delete_audios();
  }
};

/******************************************************************************/
/*** Preload stimuli **********************************************************/
/******************************************************************************/

var preload = {
  type: jsPsychPreload,
  auto_preload: true,
};

/******************************************************************************/
/********************** Main experiment ***************************************/
/******************************************************************************/
// Create csv file
// Create outputFile name
var participant_id = jsPsych.randomization.randomID(10); // Generates a unique ID so participant submissions don't overwrite each other
var outputFile = `csv_data/voicecloning_data_${participant_id}.csv`
// Create headers in the output file
var trial_headers = create_header(outputFile);

var recordings_list = [];
for (var inputs of shuffled_recordings) {
  var output = create_recordings_trial(inputs, outputFile)
  var start_recording_trial = output[0]
  var record_audio_trial = output[1] 
  recordings_list = [].concat(recordings_list, start_recording_trial, record_audio_trial);
}

var voice_trials = [];
var trial_order = [1, 2, 3, 4, 5, 6];
for (var order of trial_order) {
  var voice_trial = create_voice_trial(outputFile, order)
  voice_trials = [].concat(voice_trials, voice_trial);
}

/******************************************************************************/
/*** Build the timeline *******************************************************/
/******************************************************************************/

var full_timeline = [].concat(
  trial_headers,
  fullscreen_trial,
  consent_form_trial,
  participant_id_trial,
  confidence_before_trial,
  instructions_recording_trial,
  initialize_microphone_trial,
  recordings_list,
  cloning_instructions_trial,
  fullscreen_trial,
  instructions_listening_trial,
  preload,
  voice_trials,
  correct_trial,
  confidence_after_trial,
  accent_accuracy_trial,
  demographics_trials,
  tts_usage_trial,
  serious_trial,
  final_screen
);

/******************************************************************************/
/*** Run the timeline *******************************************************/
/******************************************************************************/

jsPsych.run(full_timeline);