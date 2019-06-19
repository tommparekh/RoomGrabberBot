// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { LuisRecognizer } = require('botbuilder-ai');

class LuisHelper {
    /**
     * Returns an object with preformatted LUIS results for the bot's dialogs to consume.
     * @param {*} logger
     * @param {TurnContext} context
     */
    static async executeLuisQuery(logger, context) {
        const bookingDetails = {};

        try {
            const recognizer = new LuisRecognizer({
                applicationId: process.env.LuisAppId,
                endpointKey: process.env.LuisAPIKey,
                endpoint: `https://${process.env.LuisAPIHostName}`
            }, {}, true);

            const recognizerResult = await recognizer.recognize(context);

            const intent = LuisRecognizer.topIntent(recognizerResult);

            bookingDetails.intent = intent;

            if (intent === 'Book_Meeting_Room') {
                // We need to get the result from the LUIS JSON which at every level returns an array

                /* do not remove. for reference only. 
                recognizerResult.luisResult.entities.forEach(element => {
                    //                console.log(`Entity Name = ${element.type}, Entity Value = ${element.entity}`);
                });
                */

                bookingDetails.location = LuisHelper.parseSimpleEntity(recognizerResult, 'location');

                // This value will be a TIMEX. And we are only interested in a Date so grab the first result and drop the Time part.
                // TIMEX is a format that represents DateTime expressions that include some ambiguity. e.g. missing a Year.

                let l_datetime = LuisHelper.parseDatetimeEntity(recognizerResult, 'datetime');
                bookingDetails.meetingDate = l_datetime.date;
                bookingDetails.meetingTime = l_datetime.time;

                let l_duration = LuisHelper.parseDatetimeEntity(recognizerResult, 'duration');
                bookingDetails.duration = l_duration.duration;

                bookingDetails.meetingRoom = 'TESTROOM';

            }
        } catch (err) {
            logger.warn(`LUIS Exception: ${err} Check your LUIS configuration`);
        }
        return bookingDetails;
    }

    static parseSimpleEntity(result, entityName) {

        let simpleEntityValue = '';

        result.luisResult.entities.forEach(element => {
            let l_entityName = element.type;

            if (l_entityName == entityName) {
                simpleEntityValue = element.entity;
            }
        });
        return simpleEntityValue;
    }

    static parseCompositeEntity(result, compositeName, entityName) {

        const compositeEntity = result.entities[compositeName];

        if (!compositeEntity || !compositeEntity[0]) return undefined;

        const entity = compositeEntity[0][entityName];
        if (!entity || !entity[0]) return undefined;

        const entityValue = entity[0][0];
        return entityValue;
    }

    static parseDatetimeEntity(result, entityName) {
        entityName = 'builtin.datetimeV2.' + entityName;

        let datetimeEntity;

        result.luisResult.entities.forEach(element => {
            let l_entityName = element.type;
            let l_entityValue = '';

            if (l_entityName == entityName) {
                datetimeEntity = element.resolution.values;    // ASSIGN VALUE          
            }
        });

        if (entityName == 'builtin.datetimeV2.datetime') {

            if (!datetimeEntity || !datetimeEntity[0]) return undefined;

            const timex = datetimeEntity[0]['timex'];
            if (!timex || !timex[0]) return undefined;

            const date = timex.split('T')[0];
            const time = timex.split('T')[1];
            const duration = 0;

            const datetimeObj = { date, time, duration };

            return datetimeObj;
        } else if (entityName == 'builtin.datetimeV2.duration') {
            const date = '';
            const time = '';

            if (datetimeEntity[0]['type'] === 'duration') {
                const duration = datetimeEntity[0]['value'];

                if (!duration || !duration[0]) return undefined;

                const durationObj = { date, time, duration };

                return durationObj;
            } else {
                return undefined;
            }
        }

        return undefined;
    }
}

module.exports.LuisHelper = LuisHelper;
