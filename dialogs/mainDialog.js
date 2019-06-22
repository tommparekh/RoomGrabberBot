// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
const { Time } = require('@microsoft/recognizers-text-data-types-timex-expression');
 
const { ComponentDialog, DialogSet, DialogTurnStatus, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { BookingDialog } = require('./bookingDialog');
const { LuisHelper } = require('./luisHelper');

const humanizeDuration = require('humanize-duration');

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';
const BOOKING_DIALOG = 'bookingDialog';

class MainDialog extends ComponentDialog {
    constructor(logger) {
        super('MainDialog');

        console.log('mainDialog.constructor()');

        if (!logger) {
            logger = console;
            logger.log('[MainDialog]: logger not passed in, defaulting to console');
        }

        this.logger = logger;

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        this.addDialog(new TextPrompt('TextPrompt'))
            .addDialog(new BookingDialog(BOOKING_DIALOG))
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.introStep.bind(this),
                this.actStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        console.log('mainDialog.run()');
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    /**
     * First step in the waterfall dialog. Prompts the user for a command.
     * Currently, this expects a booking request, like "book me a flight from Paris to Berlin on march 22"
     * Note that the sample LUIS model will only recognize Paris, Berlin, New York and London as airport cities.
     */
    async introStep(stepContext) {
        console.log('mainDialog.introStep()');
        if (!process.env.LuisAppId || !process.env.LuisAPIKey || !process.env.LuisAPIHostName) {
            await stepContext.context.sendActivity('NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.');
            return await stepContext.next();
        }

        return await stepContext.prompt('TextPrompt', { prompt: 'What can I help you with today?\nSay something like "Book a meeting room for tomorrow at 2:00 PM for 1 hr. at New Jersey"' });

    }

    /**
     * Second step in the waterall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
     * Then, it hands off to the bookingDialog child dialog to collect any remaining details.
     */
    async actStep(stepContext) {
        console.log('mainDialog.actStep()');

        let bookingDetails = {};

        if (process.env.LuisAppId && process.env.LuisAPIKey && process.env.LuisAPIHostName) {
            // Call LUIS and gather any potential booking details.
            // This will attempt to extract the origin, destination and travel date from the user's message
            // and will then pass those values into the booking dialog
            bookingDetails = await LuisHelper.executeLuisQuery(this.logger, stepContext.context);

           // this.logger.log('LUIS extracted these booking details:', bookingDetails);
        }

        this.logger.log('LUIS extracted these booking details:', bookingDetails);

        // Run the BookingDialog giving it whatever details we have from the LUIS call, it will fill out the remainder.
        return await stepContext.beginDialog('bookingDialog', bookingDetails);
    }

    /**
     * This is the final step in the main waterfall dialog.
     * It wraps up the sample "book a flight" interaction with a simple confirmation.
     */
    async finalStep(stepContext) {

        console.log('mainDialog.finalStep()');

        // If the child dialog ("bookingDialog") was cancelled or the user failed to confirm, the Result here will be null.
        if (stepContext.result) {
            const result = stepContext.result;

            console.log(result);
        
            // Now we have all the booking details.
            // This is where calls to the booking AOU service or database would go.
            // If the call to the booking service was successful tell the user.

            const timeProperty = new TimexProperty('T'+result.meetingTime);       
            const meetingTimeMsg = timeProperty.toNaturalLanguage(new Date(Date.now()).getTime);   
            const meetingDateProperty = new TimexProperty(result.meetingDate);    
            const meetingDateMsg = meetingDateProperty.toNaturalLanguage(new Date(Date.now()));            
            const duration = (parseInt(result.duration))*1000;  // convert duration (sec) to milliseconds. Required for Humanize-Duration library.
            const meetingDurationMsg = humanizeDuration(duration);
                        
            /*  moment.js required
                let meetingDurationMsg = moment.duration(duration, 'seconds').humanize();
            */
         
            const msg = `I have ${ result.meetingRoom } at ${result.location} booked, for ${ meetingDateMsg } at ${meetingTimeMsg} for ${ meetingDurationMsg }.`;
            await stepContext.context.sendActivity(msg);
        } else {
            await stepContext.context.sendActivity('Thank you.');
        }
        return await stepContext.endDialog();
    }

}

module.exports.MainDialog = MainDialog;
