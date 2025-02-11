var spawn = require('child_process').spawn;
var isMac = require('os').type() == 'Darwin' || require('os').type().indexOf('Windows') > -1;
var IsSilence = require('./silenceTransform.js');
var PassThrough = require('stream').PassThrough;
var path = require('path');
var bunyan = require('bunyan');

var logger;

var mic = function mic(options, parentLogger) {

    options = options || {};

    if(!parentLogger){

        logger = bunyan.createLogger({name: "mic"});
    }else{

         logger = parentLogger.child({loc: 'mic'});
    }

    var that = {};
    var endian = options.endian || 'little';
    var bitwidth = options.bitwidth || '16';
    var encoding = options.encoding || 'signed-integer';
    var rate = options.rate || '16000';
    var channels = options.channels || '1';
    var device = options.device || 'plughw:1,0';
    var exitOnSilence = options.exitOnSilence || 0;
    var fileType = options.fileType || 'wav';
    var debug = options.debug || false;
    var format, formatEndian, formatEncoding;
    var audioProcess = null;
    var infoStream = new PassThrough;
    var audioStream = new IsSilence(logger, {debug: debug});
    var audioProcessOptions = {
        stdio: ['ignore', 'pipe', 'ignore']
    };

    if(debug) {
        audioProcessOptions.stdio[2] = 'pipe';
    }

    // Setup format variable for arecord call
    if(endian === 'big') {
        formatEndian = 'BE';
    } else {
        formatEndian = 'LE';
    }
    if(encoding === 'unsigned-integer') {
        formatEncoding = 'U';
    } else {
        formatEncoding = 'S';
    }
    format = formatEncoding + bitwidth + '_' + formatEndian;
    audioStream.setNumSilenceFramesExitThresh(parseInt(exitOnSilence, 10));

    that.start = function start() {

        var filepath = path.join(__dirname,'record.sh');

        if(audioProcess === null) {
            audioProcess = isMac
            ? spawn('rec', ['-b', bitwidth, '--endian', endian, '-c', channels, '-r', rate, '-e', encoding, '-t', fileType, '-'], audioProcessOptions)
            : spawn('arecord', ['-c', channels, '-r', rate, '-f', format, '-D', device], audioProcessOptions);
            audioProcess.on('exit', function(code, sig) {
                    if(code != null && sig === null) {
                        audioStream.emit('audioProcessExitComplete');
                        logger.debug("recording audioProcess has exited with code = %d", code);
                    }
                });
            audioProcess.stdout.pipe(audioStream);
            if(debug) {
                audioProcess.stderr.pipe(infoStream);
            }
            audioStream.emit('startComplete');
        } else {
            if(debug) {
                throw new Error("Duplicate calls to start(): Microphone already started!");
            }
        }
    };

    that.stop = function stop() {
        if(audioProcess != null) {
            audioProcess.kill('SIGTERM');
            audioProcess = null;
            audioStream.emit('stopComplete');
            logger.info("Microhphone stopped");
        }
    };

    that.pause = function pause() {
        if(audioProcess != null) {
            audioProcess.kill('SIGSTOP');
            audioStream.pause();
            audioStream.emit('pauseComplete');
            logger.info("Microphone paused");
        }
    };

    that.resume = function resume() {
        if(audioProcess != null) {
            audioProcess.kill('SIGCONT');
            audioStream.resume();
            audioStream.emit('resumeComplete');
            logger.info("Microphone resumed");
        }
    }

    that.getAudioStream = function getAudioStream() {
        return audioStream;
    }

    if(debug) {
        infoStream.on('data', function(data) {
                logger.debug("Received Info: " + data);
            });
        infoStream.on('error', function(error) {
                logger.error("Error in Info Stream: " + error);
            });
    }

    return that;
}

module.exports = mic;
