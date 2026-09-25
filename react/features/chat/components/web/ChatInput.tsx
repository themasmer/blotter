import { Theme } from '@mui/material';
import React, { Component, RefObject } from 'react';
import { WithTranslation } from 'react-i18next';
import { withStyles } from 'tss-react/mui';

import { isMobileBrowser } from '../../../base/environment/utils';
import { translate } from '../../../base/i18n/functions';
import Icon from '../../../base/icons/components/Icon';
import { IconMic, IconSend } from '../../../base/icons/svg';
import Button from '../../../base/ui/components/web/Button';
import Input from '../../../base/ui/components/web/Input';
import { CHAR_LIMIT } from '../../constants';
import { IMessage } from '../../types';


const styles = (_theme: Theme) => {
    return {
        dictationButton: {
            alignItems: 'center',
            backgroundColor: _theme.palette.action02,
            border: 0,
            borderRadius: _theme.shape.borderRadius,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            marginRight: _theme.spacing(2),
            padding: _theme.spacing(2),

            '&:disabled': {
                cursor: 'not-allowed',
                opacity: 0.5
            }
        },
        dictating: {
            backgroundColor: _theme.palette.actionDanger
        },
        speechError: {
            color: _theme.palette.textError,
            marginTop: _theme.spacing(2),
            ..._theme.typography.labelRegular
        }
    };
};

interface ISpeechRecognitionResultEvent {
    results: ArrayLike<{
        0: { transcript: string; };
        isFinal: boolean;
    }>;
}

interface ISpeechRecognitionErrorEvent {
    error: string;
}

interface ISpeechRecognition {
    abort: () => void;
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onend: (() => void) | null;
    onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: ISpeechRecognitionResultEvent) => void) | null;
    start: () => void;
    stop: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

/**
 * The type of the React {@code Component} props of {@link ChatInput}.
 */
interface IProps extends WithTranslation {

    /**
     * An object containing the CSS classes.
     */
    classes?: Partial<Record<keyof ReturnType<typeof styles>, string>>;

    /**
     * The message currently being edited, if any.
     */
    editingMessage?: IMessage;

    /**
     * Callback invoked to cancel message editing.
     */
    onCancelEdit?: () => void;

    /**
     * Callback to invoke on message send.
     */
    onSend: Function;
}

/**
 * The type of the React {@code Component} state of {@link ChatInput}.
 */
interface IState {

    isDictating: boolean;

    /**
     * User provided nickname when the input text is provided in the view.
     */
    message: string;

    speechError?: string;
}

/**
 * Implements a React Component for drafting and submitting a chat message.
 *
 * @augments Component
 */
class ChatInput extends Component<IProps, IState> {
    _dictationBase = '';
    _recognition?: ISpeechRecognition;
    _textArea?: RefObject<HTMLTextAreaElement>;

    override state: IState = {
        isDictating: false,
        message: '',
        speechError: undefined
    };

    /**
     * Initializes a new {@code ChatInput} instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props: IProps) {
        super(props);

        this._textArea = React.createRef<HTMLTextAreaElement>();

        // Bind event handlers so they are only bound once for every instance.
        this._onDetectSubmit = this._onDetectSubmit.bind(this);
        this._onDictationKeyDown = this._onDictationKeyDown.bind(this);
        this._onDictationKeyUp = this._onDictationKeyUp.bind(this);
        this._onDictationPointerDown = this._onDictationPointerDown.bind(this);
        this._onMessageChange = this._onMessageChange.bind(this);
        this._onSubmitMessage = this._onSubmitMessage.bind(this);
        this._startDictation = this._startDictation.bind(this);
        this._onStopDictation = this._onStopDictation.bind(this);
    }

    /**
     * Implements React's {@link Component#componentDidMount()}.
     *
     * @inheritdoc
     */
    override componentDidMount() {
        if (isMobileBrowser()) {
            // Ensure textarea is not focused when opening chat on mobile browser.
            this._textArea?.current && this._textArea.current.blur();
        } else {
            this._focus();
        }

        window.addEventListener('pointerup', this._onStopDictation);
        window.addEventListener('pointercancel', this._onStopDictation);
        window.addEventListener('blur', this._onStopDictation);
    }

    override componentWillUnmount() {
        window.removeEventListener('pointerup', this._onStopDictation);
        window.removeEventListener('pointercancel', this._onStopDictation);
        window.removeEventListener('blur', this._onStopDictation);
        if (this._recognition) {
            this._recognition.onend = null;
            this._recognition.onerror = null;
            this._recognition.onresult = null;
            this._recognition.abort();
        }
    }

    /**
     * Implements {@code Component#componentDidUpdate}.
     *
     * @inheritdoc
     */
    override componentDidUpdate(prevProps: Readonly<IProps>) {
        if (prevProps.editingMessage?.messageId !== this.props.editingMessage?.messageId) {
            this.setState({
                message: this.props.editingMessage?.message ?? ''
            });
            this._focus();
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    override render() {
        const classes = withStyles.getClasses(this.props);
        const speechRecognitionSupported = Boolean(this._getSpeechRecognitionConstructor());

        return (
            <div className = { `chat-input-container${this.state.message.trim().length ? ' populated' : ''}` }>
                <div id = 'chat-input' >
                    <Input
                        className = 'chat-input'
                        id = 'chat-input-messagebox'
                        maxRows = { 5 }
                        onChange = { this._onMessageChange }
                        onKeyPress = { this._onDetectSubmit }
                        placeholder = { this.props.t('chat.messagebox') }
                        ref = { this._textArea }
                        textarea = { true }
                        value = { this.state.message } />
                    <button
                        aria-label = { this.props.t('chat.dictation.holdToTalk') }
                        aria-pressed = { this.state.isDictating }
                        className = { `${classes.dictationButton} ${this.state.isDictating ? classes.dictating : ''}` }
                        data-testid = 'blotter-dictation'
                        disabled = { !speechRecognitionSupported }
                        onBlur = { this._onStopDictation }
                        onKeyDown = { this._onDictationKeyDown }
                        onKeyUp = { this._onDictationKeyUp }
                        onPointerDown = { this._onDictationPointerDown }
                        type = 'button'>
                        <Icon src = { IconMic } />
                    </button>
                    <Button
                        accessibilityLabel = { this.props.t('chat.sendButton') }
                        disabled = { !this.state.message.trim() }
                        icon = { IconSend }
                        onClick = { this._onSubmitMessage }
                        size = { isMobileBrowser() ? 'large' : 'medium' } />
                </div>
                {(!speechRecognitionSupported || this.state.speechError) && (
                    <div
                        className = { classes.speechError }
                        role = 'alert'>
                        {this.state.speechError || this.props.t('chat.dictation.unsupported')}
                    </div>
                )}
            </div>
        );
    }

    /**
     * Place cursor focus on this component's text area.
     *
     * @private
     * @returns {void}
     */
    _focus() {
        this._textArea?.current && this._textArea.current.focus();
    }

    /**
     * Submits the message to the chat window.
     *
     * @returns {void}
     */
    _onSubmitMessage() {
        const { onSend } = this.props;

        const trimmed = this.state.message.trim().slice(0, CHAR_LIMIT);

        if (trimmed) {
            onSend(trimmed);

            this.setState({ message: '' });

            // Keep the textarea in focus when sending messages via submit button.
            this._focus();

        }

    }

    /**
     * Detects if enter has been pressed. If so, submit the message in the chat
     * window.
     *
     * @param {string} event - Keyboard event.
     * @private
     * @returns {void}
     */
    _onDetectSubmit(event: any) {
        // Composition events used to add accents to characters
        // despite their absence from standard US keyboards,
        // to build up logograms of many Asian languages
        // from their base components or categories and so on.
        if (event.isComposing || event.keyCode === 229) {
            // keyCode 229 means that user pressed some button,
            // but input method is still processing that.
            // This is a standard behavior for some input methods
            // like entering japanese or сhinese hieroglyphs.
            return;
        }

        if (event.key === 'Escape' && this.props.editingMessage) {
            event.preventDefault();
            event.stopPropagation();

            this.props.onCancelEdit?.();
            this.setState({ message: '' });

            return;
        }

        if (event.key === 'Enter'
            && event.shiftKey === false
            && event.ctrlKey === false) {
            event.preventDefault();
            event.stopPropagation();

            this._onSubmitMessage();
        }
    }

    /**
     * Updates the known message the user is drafting.
     *
     * @param {string} value - Keyboard event.
     * @private
     * @returns {void}
     */
    _onMessageChange(value: string) {
        this.setState({ message: value.slice(0, CHAR_LIMIT) });
    }

    _getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
        const speechWindow = window as typeof window & {
            SpeechRecognition?: SpeechRecognitionConstructor;
            webkitSpeechRecognition?: SpeechRecognitionConstructor;
        };

        return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    }

    _startDictation() {
        if (this.state.isDictating) {
            return;
        }

        const Recognition = this._getSpeechRecognitionConstructor();

        if (!Recognition) {
            this.setState({ speechError: this.props.t('chat.dictation.unsupported') });

            return;
        }

        if (!this._recognition) {
            this._recognition = new Recognition();
            this._recognition.continuous = true;
            this._recognition.interimResults = true;
            this._recognition.lang = document.documentElement.lang || navigator.language;
            this._recognition.onresult = event => {
                let transcript = '';

                for (let index = 0; index < event.results.length; index++) {
                    transcript += event.results[index][0].transcript;
                }

                const separator = this._dictationBase && transcript ? ' ' : '';

                this.setState({
                    message: `${this._dictationBase}${separator}${transcript}`.slice(0, CHAR_LIMIT)
                });
            };
            this._recognition.onerror = event => {
                const speechError = event.error === 'not-allowed' || event.error === 'service-not-allowed'
                    ? this.props.t('chat.dictation.permissionDenied')
                    : this.props.t('chat.dictation.failed');

                this.setState({
                    isDictating: false,
                    speechError
                });
            };
            this._recognition.onend = () => this.setState({ isDictating: false });
        }

        this._dictationBase = this.state.message;
        this.setState({
            isDictating: true,
            speechError: undefined
        });

        try {
            this._recognition?.start();
        } catch {
            this.setState({
                isDictating: false,
                speechError: this.props.t('chat.dictation.failed')
            });
        }
    }

    _onStopDictation() {
        if (!this.state.isDictating) {
            return;
        }

        this._recognition?.stop();
        this.setState({ isDictating: false });
    }

    _onDictationPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
        if (event.button === 0) {
            event.preventDefault();
            this._startDictation();
        }
    }

    _onDictationKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
            event.preventDefault();
            this._startDictation();
        }
    }

    _onDictationKeyUp(event: React.KeyboardEvent<HTMLButtonElement>) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this._onStopDictation();
        }
    }
}

export default translate(withStyles(ChatInput, styles));
