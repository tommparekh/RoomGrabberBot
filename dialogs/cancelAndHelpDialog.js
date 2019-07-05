// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ComponentDialog, DialogTurnStatus } = require('botbuilder-dialogs');

/**
 * This base class watches for common phrases like "help" and "cancel" and takes action on them
 * BEFORE they reach the normal bot logic.
 */
class CancelAndHelpDialog extends ComponentDialog {
    async onBeginDialog(innerDc, options) {
        const result = await this.interrupt(innerDc);
        if (result) {
            return result;
        }
        return await super.onBeginDialog(innerDc, options);
    }

    async onContinueDialog(innerDc) {
        const result = await this.interrupt(innerDc);
        if (result) {
            return result;
        }
        return await super.onContinueDialog(innerDc);
    }

    async interrupt(innerDc) {
        console.log(`cancelAndHelpDialog.interrupt()  innerDc = ${innerDc}`);

        if (innerDc) {
   //         console.log(`cancelAndHelpDialog activity text = ${innerDc.context.activity.text}`);

            if(innerDc.context.activity.text) {
                const text = innerDc.context.activity.text.toLowerCase();

                switch (text) {
                case 'help':
                case '?':
                    await innerDc.context.sendActivity('[ This is where to send sample help to the user... ]');
                    return { status: DialogTurnStatus.waiting };
                case 'cancel':
                    await innerDc.context.sendActivity('Cancelling');
                case 'quit':
                    await innerDc.context.sendActivity('Cancelling');
                    return await innerDc.cancelAllDialogs();
                }
            }
        }
    }
}

module.exports.CancelAndHelpDialog = CancelAndHelpDialog;
