var Transform = require('stream').Transform;
var util = require("util");



function IsSilence(logger, options) {
    var that = this;

    this.logger = logger;

    if (options && options.debug) {
        that.debug = options.debug;
        delete options.debug;
    }
    Transform.call(that, options);
    var consecSilenceCount = 0;
    var numSilenceFramesExitThresh = 0;

    var recording = false;

    that.getNumSilenceFramesExitThresh = function getNumSilenceFramesExitThresh() {
        return numSilenceFramesExitThresh;
    };

    that.getConsecSilenceCount = function getConsecSilenceCount() {
        return consecSilenceCount;
    };

    that.setNumSilenceFramesExitThresh = function setNumSilenceFramesExitThresh(numFrames) {
        numSilenceFramesExitThresh = numFrames;
        return;
    };

    that.incrConsecSilenceCount = function incrConsecSilenceCount() {
        consecSilenceCount++;
        return consecSilenceCount;
    };

    that.resetConsecSilenceCount = function resetConsecSilenceCount() {
        consecSilenceCount = 0;
        return;
    };
};
util.inherits(IsSilence, Transform);

IsSilence.prototype._transform = function(chunk, encoding, callback) {
    var i;
    var speechSample;
    var silenceLength = 0;
    var self = this;
    var debug = self.debug;
    var consecutiveSilence = self.getConsecSilenceCount();
    var numSilenceFramesExitThresh = self.getNumSilenceFramesExitThresh();
    var incrementConsecSilence = self.incrConsecSilenceCount;
    var resetConsecSilence = self.resetConsecSilenceCount;


    if (numSilenceFramesExitThresh) {
        for (i = 0; i < chunk.length; i = i + 2) {
            if (chunk[i + 1] > 128) {
                speechSample = (chunk[i + 1] - 256) * 256;
            } else {
                speechSample = chunk[i + 1] * 256;
            }
            speechSample += chunk[i];

            //console.log('sample strength: ' + speechSample + ', chunk[i+1]=' + chunk[i + 1]);
            if (Math.abs(speechSample) > 2000) {

                if (!self.recording) {
                    self.logger.debug('emit startSpeech event');
                    self.emit('startSpeech');
                    self.recording = true;
                }

                self.logger.debug("Found speech block");

                resetConsecSilence();
                break;
            } else {
                silenceLength++;
            }

        }
        if (silenceLength == chunk.length / 2) {
            consecutiveSilence = incrementConsecSilence();
            self.logger.debug("Found silence block: %d of %d", consecutiveSilence, numSilenceFramesExitThresh);

            //emit 'silence' only once each time the threshold condition is met
            if (consecutiveSilence === numSilenceFramesExitThresh && self.recording) {
                self.logger.info('emit silicne event');
                self.emit('silence');
                self.recording = false;
                resetConsecSilence();
            }
        }
    }
    this.push(chunk);
    callback();
};

module.exports = IsSilence;