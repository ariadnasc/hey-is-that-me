const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process'); // for running ffmpeg
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;
const ALLOWED_FOLDER = path.resolve(__dirname, 'audios');

// Serve static files from the "public" folder
app.use(express.json({ limit: '50mb' })); // must come before any routes
app.use('/audios', express.static(path.join(__dirname, 'audios')));
app.use('/csv_data', express.static(path.join(__dirname, 'csv_data')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(cors());

// Handle saving to CSV
app.post('/save', (req, res) => {
  const { name, data_in } = req.body;

  /* if (!fileName || !data || !Array.isArray(data)) {
    return res.status(400).send('Invalid request: must include fileName and data array');
  } */ 
  const filePath = path.join(__dirname, name); //.endsWith('.csv') ? fileName : `${fileName}.csv`);

  /* const rows = data_in.map(row => {
    return Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  }).join('\n') + '\n'; */ 

  fs.appendFile(filePath, data_in, err => {
    if (err) {
      console.error(err);
      return res.status(500).send('Failed to write to CSV.');
    }
    res.send('Data saved!');
  });
});

app.post('/save-audio', (req, res) => {
    //console.log('Received audio post');
    //res.send('Audio received');
    const { base64Audio, outputData, outputFile, outputPath } = req.body;
  
    // Save CSV file first
    const filePath = path.join(__dirname, outputFile); //.endsWith('.csv') ? fileName : `${fileName}.csv`);
    fs.appendFile(filePath, outputData, err => {
        if (err) {
          console.error(err);
          return res.status(500).send('Failed to write to CSV.');
        }
        // res.send('Data saved!');
      });

    // Save audio
    if (!base64Audio || !outputPath) {
      return res.status(400).send('Missing base64Audio or outputPath');
    }
  
    // Remove prefix like "data:audio/webm;base64," if present
    const base64String = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
  
    // Decode base64 to buffer
    const audioBuffer = Buffer.from(base64String, 'base64');
  
    // Create temp file path
    const tmpFile = path.join(os.tmpdir(), `audio_${Date.now()}.webm`);
  
    // Save buffer to temp .webm file
    fs.writeFile(tmpFile, audioBuffer, (err) => {
      if (err) {
        console.error('Error saving temp file:', err);
        return res.status(500).send('Failed to save temp file');
      }
  
      // Path to ffmpeg binary - adjust if needed
      const ffmpegPath = '/opt/homebrew/bin/ffmpeg'; // assumes ffmpeg is in your PATH
  
      // Run ffmpeg to convert file
      const cmd = `${ffmpegPath} -y -i "${tmpFile}" -ar 24000 "audios/${outputPath}"`;
  
      exec(cmd, (error, stdout, stderr) => {
        // Delete temp file after conversion
        fs.unlink(tmpFile, () => {});
  
        if (error) {
          console.error('FFmpeg error:', error);
          console.error(stderr);
          return res.status(500).send('Failed to convert audio');
        }
  
        console.log('FFmpeg output:', stdout);
        res.send('Audio saved and converted successfully');
      });
    });
  });

// Delete files from ALLOWED_FOLDER
app.delete('/delete-all-files', async (req, res, next) => {
    fs.readdir(ALLOWED_FOLDER, (err, files) => {
      if (err) {
          return res.status(500).send('Unable to read folder');
      }

      // Delete each file
      for (const file of files) {
          const filePath = path.join(ALLOWED_FOLDER, file);
          fs.unlink(filePath, (err) => {
              if (err) {
                  console.error(`Failed to delete ${filePath}:`, err);
              }
          });
      }
      res.send('Files deleted');
    });
});

// Endpoint to read and return filenames
app.get('/get-filenames', (req, res) => {
  fs.readdir(ALLOWED_FOLDER, (err, files) => {
      if (err) {
          console.error('Error reading folder:', err);
          return res.status(500).json({ error: 'Failed to read folder' });
      }

      fileNames = files;
      res.json({ files: fileNames });
  });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });