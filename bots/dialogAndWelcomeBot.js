// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { CardFactory } = require('botbuilder-core');
const { DialogBot } = require('./dialogBot');
const WelcomeCard = require('./resources/welcomeCard.json');

class DialogAndWelcomeBot extends DialogBot {

    constructor(conversationState, userState, dialog, logger) {
        super(conversationState, userState, dialog, logger);

//        console.log('DialogAndWelcomeBot.constructor()');

        this.onMembersAdded(async (context, next) => {
//            console.log('DialogAndWelcomeBot.onMembersAdded()');
//            console.log(`Activity Type = ${context.activity.type}`);
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                 //   const welcomeCard = CardFactory.adaptiveCard(WelcomeCard);
                 //   await context.sendActivity({ attachments: [welcomeCard] });

                 await context.sendActivity('Welcome to RoomGrabberBot. Type anything to get logged in. Type \'logout\' to sign-out.');
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
        
        this.onTokenResponseEvent(async (context, next) => {
//            console.log('Running dialog with Token Response Event Activity.');
//            console.log('dialogAndWelcomeBot.onTokenResponseEvent()');
//            console.log(`Activity Type = ${context.activity.type}`);

            // Run the Dialog with the new Token Response Event Activity.
            await this.dialog.run(context, this.dialogState);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onUnrecognizedActivityType(async (context, next) => {
//            console.log('dialogAndWelcomeBot.onUnrecognizedActivityType()');
//            console.log(`Activity Type = ${context.activity.type}`);
            if (context.activity.type === 'invoke') {
                await this.dialog.run(context, this.dialogState);
            }
            await next();
        });

    }
}



module.exports.DialogAndWelcomeBot = DialogAndWelcomeBot;
