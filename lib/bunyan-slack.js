var util = require('util'),
    request = require('request'),
    extend = require('extend.js');
var Writable = require('stream').Writable;

function BunyanSlack(options, error) {
    Writable.call(this, {
        objectMode: true
    });
    options = options || {};
    if (!options.webhook_url && !options.webhookUrl) {
        throw new Error("webhook url cannot be null");
    } else {

        this.customFormatter = options.customFormatter;
        this.webhook_url = options.webhook_url || options.webhookUrl;
        this.icon_url = options.icon_url || options.iconUrl;
        this.icon_emoji = options.icon_emoji || options.iconEmoji;
        this.channel = options.channel || "#node-alarm";
        this.username = options.username || "bunyan-hub";
        this.error = error || function (err) {
            this.emit('error', err);
        };

        if (!this.icon_url && !this.icon_emoji) {
            this.icon_emoji = ':scream_cat:';
        }

        if (!this.customFormatter) {
            this.customFormatter = function (record, levelName) {
                var text = util.format("[%s @ %s/%s/%s] %s",
                    levelName.toUpperCase(),
                    record.hostname, record.app, record.name,
                    record.msg);
                if (record.err) {
                    if (record.err.stack) {
                        text += '\n\n' + record.err.stack;
                    } else if (record.err.message) {
                        text += '\n\n' + 'Error : ' + record.err.message;
                    }
                }
                return {
                    text: text
                }
            };
        }

    }
}
util.inherits(BunyanSlack, Writable);

var nameFromLevel = {
    10: 'trace',
    20: 'debug',
    30: 'info',
    40: 'warn',
    50: 'error',
    60: 'fatal'
};

BunyanSlack.prototype._write = function write(record, enc, cb) {

    if (typeof record === "string") {
        record = JSON.parse(record);
    }

    var levelName = nameFromLevel[record.level];

    var message;
    try {
        message = this.customFormatter(record, levelName);
    } catch (err) {
        return this.error(err);
    }
    var base = {
        channel: this.channel,
        username: this.username,
        icon_url: this.icon_url,
        icon_emoji: this.icon_emoji
    };

    message = extend(base, message);

    request.post({
        url: this.webhook_url,
        body: JSON.stringify(message)
    })
        .on('error', function (err) {
            return this.error(err);
        });

    cb();
};

module.exports = BunyanSlack;
