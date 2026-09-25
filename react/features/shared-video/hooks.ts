import { SharedVideoButton } from './components';

const shareVideo = {
    key: 'sharedvideo',
    Content: SharedVideoButton,
    group: 3
};

/**
 * A hook that returns the shared video button if it is enabled and undefined otherwise.
 *
 *  @returns {Object | undefined}
 */
export function useSharedVideoButton() {
    return shareVideo;
}
