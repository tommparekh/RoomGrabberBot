// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { DateTimePrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');

const DATETIME_PROMPT = 'datetimePrompt';
const WATERFALL_DIALOG = 'waterfallDialog';

class DateResolverDialog extends CancelAndHelpDialog {
    constructor(id) {
        super(id || 'dateResolverDialog');
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT, this.dateTimePromptValidator.bind(this)))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.initialStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async initialStep(stepContext) {
        console.log('DateResolverDialog.initialStep()');
        const timex = stepContext.options.date;

  //      console.log(stepContext);

        const promptMsg = 'On what date would you like to book the meeting room?';
        const repromptMsg = "I'm sorry, for best results, please enter your meeting date including the month, day and year.";

        console.log(`***************bookingDialog.bookingDateStep 1. stepContext.options.date = ${JSON.stringify(timex)}`)

        if (!timex) {

            console.log(`***************bookingDialog.bookingDateStep 2. timex is undefined.`)


            // We were not given any date at all so prompt the user.
            return await stepContext.prompt(DATETIME_PROMPT,
                {
                    prompt: promptMsg,
                    retryPrompt: repromptMsg
                });
        } else {
            // We have a Date we just need to check it is unambiguous.

            const timexProperty = new TimexProperty(timex);

            console.log(`***************   bookingDialog.bookingDateStep  TimexProperty = ${JSON.stringify(timexProperty)} ***************`);
            console.log('\n \n \n');
            if (!timexProperty.types.has('definite')) {
                // This is essentially a "reprompt" of the data we were given up front.
                return await stepContext.prompt(DATETIME_PROMPT, { prompt: repromptMsg });
            } else {
                return await stepContext.next({ timex: timex });
            }
        }
    }

    async finalStep(stepContext) {
        console.log(`dateTimePromptValidator.finalStep() stepContext = ${stepContext}`);
        const timex = stepContext.result[0].timex;
        return await stepContext.endDialog(timex);
    }

    async dateTimePromptValidator(promptContext) {
      //  console.log(`JSON conversion for dateTimePromptValidator.promptContext : ${JSON.stringify(promptContext)}`);
      
     //   console.log(`dateTimePromptValidator.promptContext.recognized.value = ${promptContext.recognized.value}`);
    
        if (promptContext.recognized.succeeded) {
            // This value will be a TIMEX. And we are only interested in a Date so grab the first result and drop the Time part.
            // TIMEX is a format that represents DateTime expressions that include some ambiguity. e.g. missing a Year.
            const timex = promptContext.recognized.value[0].timex.split('T')[0];

            console.log(`dateTimePromptValidator.recognized type is : ${JSON.stringify(promptContext.recognized.value[0])}`);

     //      const tmp = new TimexProperty(timex);
     //       console.log(`JSON conversion for dateTimePromptValidator.tmp : ${JSON.stringify(tmp)}`);

            // If this is a definite Date including year, month and day we are good otherwise reprompt.
            // A better solution might be to let the user know what part is actually missing.
     //       return new TimexProperty(timex).types.has('definite');
            return (promptContext.recognized.value[0].type == "date");  
              
        } else {
            return false;
        }
    }
}

module.exports.DateResolverDialog = DateResolverDialog;
