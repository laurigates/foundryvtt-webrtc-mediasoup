/**
 * MediaSoup Configuration Dialog for FoundryVTT
 * Provides a comprehensive setup guide and configuration interface
 */

import { MODULE_ID, MODULE_TITLE, SETTING_MEDIASOUP_URL, SETTING_AUTO_CONNECT } from '../constants/index.js';

export class MediaSoupConfigDialog extends FormApplication {
    constructor(object = {}, options = {}) {
        super(object, options);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'mediasoup-config-dialog',
            title: `${MODULE_TITLE} Configuration`,
            template: 'modules/mediasoup-vtt/templates/config-dialog.html',
            width: 700,
            height: 800,
            resizable: true,
            classes: ['mediasoup-config-dialog']
        });
    }

    getData() {
        const data = super.getData();
        data.serverUrl = game.settings.get(MODULE_ID, SETTING_MEDIASOUP_URL) || '';
        data.autoConnect = game.settings.get(MODULE_ID, SETTING_AUTO_CONNECT);
        return data;
    }

    async _updateObject(event, formData) {
        await game.settings.set(MODULE_ID, SETTING_MEDIASOUP_URL, formData.serverUrl);
        await game.settings.set(MODULE_ID, SETTING_AUTO_CONNECT, formData.autoConnect);
        ui.notifications.info(`${MODULE_TITLE}: Configuration saved successfully.`);
    }
}