// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
const { ConfirmPrompt, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { DateResolverDialog } = require('./dateResolverDialog');

const humanizeDuration = require('humanize-duration');

const CONFIRM_PROMPT = 'confirmPrompt';
const DATE_RESOLVER_DIALOG = 'dateResolverDialog';
const TEXT_PROMPT = 'textPrompt';
const WATERFALL_DIALOG = 'waterfallDialog';

class BookingDialog extends CancelAndHelpDialog {
    constructor(id) {
        super(id || 'bookingDialog');

        console.log('bookingDialog.constructor');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new DateResolverDialog(DATE_RESOLVER_DIALOG))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
				this.bookingLocationStep.bind(this),
                this.bookingMeetingRoomStep.bind(this),
                this.bookingDateStep.bind(this),
                this.bookingTimeStep.bind(this),
                this.bookingDurationStep.bind(this),
                this.bookingConfirmStep.bind(this),
                this.bookingFinalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

   /**
     * 
     * If booking location is not provided, prompt for one. 
     */

    async bookingLocationStep(stepContext) {

        console.log('bookingDialog.bookingLocationStep');
     
        const bookingDetails = stepContext.options;

        if (!bookingDetails.location) {
            return await stepContext.prompt(TEXT_PROMPT, { prompt: 'Which location do you need to book a meeting room?' });
        } else {
            return await stepContext.next(bookingDetails.location);
        }
    }

        /**
     * 
     * If booking meeting room is not provided, prompt for one. 
     */

    async bookingMeetingRoomStep(stepContext) {
        console.log('bookingDialog.bookingMeetingRoomStep');
        const bookingDetails = stepContext.options;
        if (!bookingDetails.meetingRoom) {
            return await stepContext.prompt(TEXT_PROMPT, { prompt: 'Which meeting room do you want to book?' });
        } else {
            return await stepContext.next(bookingDetails.meetingRoom);
        }
    }

    /**
     * 
     * If booking date is not provided, prompt for one. 
     */

    async bookingDateStep(stepContext) {
        console.log('bookingDialog.bookingDateStep');
        const bookingDetails = stepContext.options;

        if (!bookingDetails.meetingDate || this.isAmbiguous(bookingDetails.meetingDate)) {
            return await stepContext.beginDialog(DATE_RESOLVER_DIALOG, { date: bookingDetails.meetingDate });
        } else {
            return await stepContext.next(bookingDetails.meetingDate);
        }
    }

    /**
     * 
     * If booking time is not provided, prompt for one. 
     */

    async bookingTimeStep(stepContext) {
        console.log('bookingDialog.bookingTimeStep');
        const bookingDetails = stepContext.options;
        if (!bookingDetails.meetingTime || this.isAmbiguousTime(bookingDetails.meetingTime)) {
             return await stepContext.beginDialog(DATE_RESOLVER_DIALOG, { date: bookingDetails.meetingTime });
        } else {
             return await stepContext.next(bookingDetails.meetingTime);
        }
        
    }

    /**
     * 
     * If booking duration is not provided, prompt for one. 
     */

    async bookingDurationStep(stepContext) {
        console.log('bookingDialog.bookingDurationStep');
        const bookingDetails = stepContext.options;
        if (!bookingDetails.duration) {
            return await stepContext.prompt(TEXT_PROMPT, { prompt: 'How long do you need a meeting room for?' });
        } else {
            return await stepContext.next(bookingDetails.duration);
        }

    }

    /**
     * Confirm the information the user has provided.
     */
    async bookingConfirmStep(stepContext) {
        console.log('bookingDialog.bookingConfirmStep');
        const bookingDetails = stepContext.options;

        // Capture the results of the previous step
        bookingDetails.duration = stepContext.result;

        const duration = (parseInt(bookingDetails.duration))*1000;  // convert duration (sec) to milliseconds. Required for Humanize-Duration library.
        const meetingDurationMsg = humanizeDuration(duration);

        const msg = `Please confirm, I have your bookinng for meeting room ${bookingDetails.meetingRoom} (${bookingDetails.location}) on ${bookingDetails.meetingDate} @ ${bookingDetails.meetingTime} for ${meetingDurationMsg}.`;

        // Offer a YES/NO prompt.
        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: msg });
    }

    /**
     * Complete the interaction and end the dialog.
     */
    async bookingFinalStep(stepContext) {
        console.log('bookingDialog.bookingFinalStep');
        if (stepContext.result === true) {
            const bookingDetails = stepContext.options;

            return await stepContext.endDialog(bookingDetails);
        } else {
            return await stepContext.endDialog();
        }
    }

    isAmbiguousTime(timex) {
        console.log(`bookingDialog.isAmbiguousTime with timex is T${timex}`);
        timex = 'T' + timex;
        const timexPropery = TimexProperty.fromTime(timex);
    
        return !timexPropery.types.has('time');
    }

    isAmbiguous(timex) {
        console.log(`bookingDialog.isAmbiguous with timex is ${timex}`);
        const timexPropery = new TimexProperty(timex);
  
        return !timexPropery.types.has('definite');
    }
}

module.exports.BookingDialog = BookingDialog;
