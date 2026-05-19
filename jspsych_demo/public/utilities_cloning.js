// helps save_data to try again if data saving fails
async function fetch_with_retry(...args) {
    let count = 0;
    while(count < 3) {
        try {
        let response = await fetch(...args);
        if (response.status !== 200) {
            throw new Error("Didn't get 200 Success");
        }
        return response;
        } catch(error) {
        console.log(error);
        }
        count++;
        await new Promise(x => setTimeout(x, 250));
    }
    throw new Error("Too many retries");
}

// save some data (as text) to the filename given
async function save_data(name, data_in) {
  // Example data to save (can be dynamic from form input)
  var data_to_send = {filename: name, filedata: data_in};

  const res = await fetch('http://localhost:3000/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data_in })
  });

}

async function save_audio(audio_data, line, outputFile, inputs) {
  var this_recording_filename = "recording_" + participant_id + "_" + inputs.name + ".wav";
  try {
    const response = await fetch_with_retry('http://localhost:3000/save-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Audio: audio_data.response,
        outputData: line,
        outputFile: outputFile,
        outputPath: this_recording_filename // example output path on server
      }),
    });

    const text = await response.text();
    //alert('Server response: ' + text);
  } catch (err) {
    console.error('Error sending audio:', err);
    //alert('Failed to send audio');
  }
}

// delete audio files at the end
async function delete_audios() {
  const res = await fetch('http://localhost:3000/delete-all-files', {
    method: 'DELETE'
  });
}

// list names in audios folder
async function get_filenames() {
  const res = await fetch('http://localhost:3000/get-filenames', {
    method: 'GET'
  });

  const data = await res.json();
  const filenames = data.files;

  console.log('Received filenames:', filenames);
                
  return filenames;
}

async function getFilenames(){
  filenames = await get_filenames();

  return filenames;
}