import { IStore } from '../app/types';

import {
    OPEN_CHAT,
    SET_CHAT_IS_RESIZING,
    SET_CHAT_WIDTH,
    SET_USER_CHAT_WIDTH
} from './actionTypes';
import { setFocusedTab } from './actions.any';
import { ChatTabs } from './constants';

export * from './actions.any';

/**
 * Displays the chat panel with the CHAT tab active.
 *
 * @param {Object} _participant - Ignored legacy private-chat recipient.
 * @param {Object} _disablePolls - Used on native.
 * @returns {{
 *     participant: Participant,
 *     type: OPEN_CHAT
 * }}
 */
export function openChat(_participant?: Object, _disablePolls?: boolean) {
    return function(dispatch: IStore['dispatch']) {
        dispatch(setFocusedTab(ChatTabs.CHAT));
        dispatch({
            type: OPEN_CHAT
        });
    };
}

/**
 * Toggles display of the chat panel.
 *
 * @returns {Function}
 */
export function toggleChat() {
    return (dispatch: IStore['dispatch']) => dispatch(openChat());
}

/**
 * Sets the chat panel's width.
 *
 * @param {number} width - The new width of the chat panel.
 * @returns {{
 *     type: SET_CHAT_WIDTH,
 *     width: number
 * }}
 */
export function setChatWidth(width: number) {
    return {
        type: SET_CHAT_WIDTH,
        width
    };
}

/**
 * Sets the chat panel's width and the user preferred width.
 *
 * @param {number} width - The new width of the chat panel.
 * @returns {{
 *     type: SET_USER_CHAT_WIDTH,
 *     width: number
 * }}
 */
export function setUserChatWidth(width: number) {
    return {
        type: SET_USER_CHAT_WIDTH,
        width
    };
}

/**
 * Sets whether the user is resizing the chat panel or not.
 *
 * @param {boolean} resizing - Whether the user is resizing or not.
 * @returns {Object}
 */
export function setChatIsResizing(resizing: boolean) {
    return {
        type: SET_CHAT_IS_RESIZING,
        resizing
    };
}
