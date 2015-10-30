'use strict';

var Job = function(exchange, message, headers, deliveryInfo, messageObject) {
  this.exchange = exchange;
  this.message = message;
  this.headers = headers;
  this.deliveryInfo = deliveryInfo;
  this.messageObject = messageObject;
  this.responseSent = false;
  this.requeued = false;
};

Job.prototype.sendFail = function(message, err) {
  this.sendResponse(message, 'fail', err);
};

Job.prototype.sendSuccess = function(message, err) {
  this.sendResponse(message, 'success', err);
};

Job.prototype.getBody = function() {
  return this.message.data.toString('utf8');
};

Job.prototype.requeue = function() {
  if (this.responseSent) {
    throw new Error(
      'Can not requeue message because response was already sent.'
    );
  }

  if (!this.requeued) {
    this.messageObject.reject(true);
    this.requeued = true;
  }
};

Job.prototype.sendResponse = function(message, status, err) {
  if (err && this.requeued) {
    err('Can not send response because job was already requeued.');
  }

  if (err && this.responseSent) {
    err('Can not send response because response was already sent.');
  }
/*
console.log(this.messageObject.deliveryTag.toString('utf8'));
console.log(this.deliveryInfo.deliveryTag.toString('utf8'));
*/
  console.log(this.deliveryInfo.replyTo);
  console.log(this.deliveryInfo.correlationId);
  // this.messageObject.acknowledge();

  if (!this.requeued &&
    !this.responseSent &&
    this.deliveryInfo.replyTo &&
    this.deliveryInfo.correlationId
  ) {
    this.exchange.publish(
      this.deliveryInfo.replyTo,
      { status: status, body: message },
      { correlationId: this.deliveryInfo.correlationId }
    );
  }

  this.responseSent = true;
};

module.exports = Job;
