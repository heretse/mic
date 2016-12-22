var mic = require('../index.js');
var fs = require('fs');

var micInstance = mic({ 'rate': '16000', 'channels': '1', 'debug': false, 'exitOnSilence': 6 });
var micInputStream = micInstance.getAudioStream();

var outputFileStream = fs.WriteStream('output.raw');

micInputStream.pipe(outputFileStream);

var chunkCounter = 0;
micInputStream.on('data', function(data) {
        console.log("Recieved Input Stream of Size %d: %d", data.length, chunkCounter++);
});

micInputStream.on('error', function(err) {
    cosole.log("Error in Input Stream: " + err);
});


micInputStream.on('startSpeech', function() {
        console.log("Got SIGNAL startSpeech");

    });


micInputStream.on('startComplete', function() {
        console.log("Got SIGNAL startComplete");

    });

micInputStream.on('stopComplete', function() {
        console.log("Got SIGNAL stopComplete");
    });

micInputStream.on('pauseComplete', function() {
        console.log("Got SIGNAL pauseComplete");

    });

micInputStream.on('resumeComplete', function() {
        console.log("Got SIGNAL resumeComplete");

    });

micInputStream.on('silence', function() {
        console.log("Got SIGNAL silence");
    });

micInputStream.on('processExitComplete', function() {
        console.log("Got SIGNAL processExitComplete");
    });

micInstance.start();


