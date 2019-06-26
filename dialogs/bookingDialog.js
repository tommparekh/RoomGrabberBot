// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
const { ConfirmPrompt, TextPrompt, WaterfallDialog,  ChoiceFactory, ChoicePrompt } = require('botbuilder-dialogs');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { DateResolverDialog } = require('./dateResolverDialog');

const humanizeDuration = require('humanize-duration');

const CHOICE_PROMPT = 'choisePrompt';
const CONFIRM_PROMPT = 'confirmPrompt';
const DATE_RESOLVER_DIALOG = 'dateResolverDialog';
const TEXT_PROMPT = 'textPrompt';
const WATERFALL_DIALOG = 'waterfallDialog';

class BookingDialog extends CancelAndHelpDialog {
    constructor(id) {
        super(id || 'bookingDialog');

        console.log('bookingDialog.constructor()');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT))
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

        console.log('bookingDialog.bookingLocationStep()');
     
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
        console.log('bookingDialog.bookingMeetingRoomStep()');

        const bookingDetails = stepContext.options;
        bookingDetails.location = stepContext.result;

        if (!bookingDetails.meetingRoom) {            
            return await stepContext.prompt(CHOICE_PROMPT, { prompt: 'Which meeting room do you want to book?', choices: ChoiceFactory.toChoices(['F001', 'F002', 'F003'])});
    //        return await stepContext.prompt(TEXT_PROMPT, { prompt: 'Which meeting room do you want to book?' });
        } else {
            return await stepContext.next(bookingDetails.meetingRoom);
        }
    }

    /**
     * 
     * If booking date is not provided, prompt for one. 
     */

    async bookingDateStep(stepContext) {
        console.log('bookingDialog.bookingDateStep()');

        const bookingDetails = stepContext.options;
        bookingDetails.meetingRoom = stepContext.result.value;

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
        console.log('bookingDialog.bookingTimeStep()');
        
        const bookingDetails = stepContext.options;
        bookingDetails.meetingDate = stepContext.result;

        if (!bookingDetails.meetingTime || this.isAmbiguousTime(bookingDetails.meetingTime)) {
            return await stepContext.beginDialog(TEXT_PROMPT, {prompt: 'When do you need a meeting room?' });
            //        return await stepContext.beginDialog(DATE_RESOLVER_DIALOG, { date: bookingDetails.meetingTime });
        } else {
             return await stepContext.next(bookingDetails.meetingTime);
        }
        
    }

    /**
     * 
     * If booking duration is not provided, prompt for one. 
     */

    async bookingDurationStep(stepContext) {
        console.log('bookingDialog.bookingDurationStep()');

        const bookingDetails = stepContext.options;
        bookingDetails.meetingTime = stepContext.result.value;

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
        console.log('bookingDialog.bookingConfirmStep()');

        const bookingDetails = stepContext.options;

        console.log(bookingDetails);
       
        // Capture the results of the previous step
        bookingDetails.duration = this.convertToDuration(stepContext.result);

        // Confirm booking
        const timeProperty = new TimexProperty('T'+bookingDetails.meetingTime);           
        const meetingTimeMsg = timeProperty.toNaturalLanguage(new Date(Date.now()).getTime);

        const meetingDateProperty = new TimexProperty(bookingDetails.meetingDate);
        const meetingDateMsg = meetingDateProperty.toNaturalLanguage(new Date(Date.now()));

        const duration = (parseInt(bookingDetails.duration))*1000;  // convert duration (sec) to milliseconds. Required for Humanize-Duration library.
        const meetingDurationMsg = humanizeDuration(duration);
        
        const msg = `Please confirm, I have your bookinng for meeting room ${bookingDetails.meetingRoom} (${bookingDetails.location}) on ${meetingDateMsg} @ ${meetingTimeMsg} for ${meetingDurationMsg}.`;

        
        // Offer a YES/NO prompt.
        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: msg });
    }

    /**
     * Complete the interaction and end the dialog.
     */
    async bookingFinalStep(stepContext) {
        console.log('bookingDialog.bookingFinalStep()');
        if (stepContext.result === true) {
            const bookingDetails = stepContext.options;

            return await stepContext.endDialog(bookingDetails);
        } else {
            return await stepContext.endDialog();
        }
    }

    convertToDuration(duration) {

        console.log('bookingDialog.convertToDuration()');

        console.log(duration);
        
        const durH1 = duration.indexOf('Hr');
        const durH2 = duration.indexOf('hr');

        console.log(durH2);

        if (durH1>1 || durH2>1) {

            console.log('true');

            if(durH1>1) {
               const hr =  duration.substring(0, durH1);
               return (parseInt(hr)*3600);
            } else if (durH2>1) {
                console.log('durH2');
                const hr = duration.substring(0, durH2);

                console.log(hr);

                return (parseInt(hr)*3600);
            }else {
                return undefined;
            }
        }

        const durM1 = duration.indexOf('Min');
        const durM2 = duration.indexOf('min');

        if (durM1>1 || durH2>1) {
            if(durM1>1) {
               const min =  duration.substring(0, durM1);
               return (parseInt(min)*60);
            } else if (durM2>1) {
                const min = duration.substring(0, durM2);
                return (parseInt(min)*60);
            }else {
                return undefined;
            }
        }

        return undefined;
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
