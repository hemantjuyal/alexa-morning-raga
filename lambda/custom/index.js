/**
 *
 * @author Hemant Juyal
 */

// sets up dependencies
const Alexa = require('ask-sdk');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const striptags = require('striptags');
const tableName = 'alexa_devotional_raga';
const podcasts = require('./data/podcast.js');
const BRAND_LOGO = 'https://smartassistants.s3-eu-west-1.amazonaws.com/images/logo/devotional_raga_logo.png';
let gTokenData = {};


/**
 * language strings Hindi
 * @type {Object}
 */
const eninData = {
  translation: {
    SKILL_NAME: 'Devotional Raga',
    SKILL_NAME_DISPLAY: 'Devotional Raga',
    EPISODE_SUMMARY: '',
    EPISODE_SUMMARY_DISPLAY_TITLE: '%s',
    EPISODE_SUMMARY_DISPLAY_BODY: '%s',
    WELCOME_MESSAGE: 'Welcome to %s, <break time="1s"/> %s brings you the remastered version of om mantras, that you can listen everyday <break time="1s"/> now playing <break time="0.5s"/> %s',
    WELCOME_MESSAGE_REPEAT: 'you were listening to <break time="0.5s"/> %s <break time="0.5s"/> would you like to resume?',
    WELCOME_MESSAGE_REPEAT_REPROMPT: 'tell me, would you like to resume?',
    WELCOME_MESSAGE_DISPLAY_TITLE: '%s',
    WELCOME_MESSAGE_DISPLAY_BODY: 'Welcome to %s <br/> %s brings you the remastered version of daily om mantras',
    WELCOME_MESSAGE_DISPLAY_BODY_CONTENT: "<br/><br/> Now Playing - %s <br/><br/> to listen next mantra you can say Next <br/><br/>",
    WELCOME_MESSAGE_REPEAT_DISPLAY_TITLE: '%s',
    WELCOME_MESSAGE_REPEAT_DISPLAY_BODY: 'you were listening to %s, would you like to resume?',
    WELCOME_MESSAGE_REPEAT_DISPLAY_BODY_CONTENT: '<br/><br/> <action value="YesIntent"> Yes </action> <br/><br/> <action value="NoIntent"> No </action>',
    PLAY_PODCAST_EPISODE_MESSAGE: '<break time="0.5s"/> %s <break time="1s"/>',
    PLAY_PODCAST_EPISODE_MESSAGE_DISPLAY_TITLE: '%s - %s',
    PLAY_PODCAST_EPISODE_MESSAGE_DISPLAY_BODY: '<br/><br/> %s <br/><br/> %s',
    PLAY_PODCAST_INVALID_EPISODE_MESSAGE: 'Sorry this mantra is not available <break time="0.5s"/> please choose another mantra name।',
    PLAY_PODCAST_INVALID_EPISODE_MESSAGE_REPEAT: 'which mantra you would like to listen to?',
    NO_MESSAGE: 'To listen a mantra you can say mantra name or mantra number. Which mantra you would like to listen to?',
    NO_MESSAGE_REPEAT: 'Please tell me, which mantra you would like to listen to?',
    NO_MESSAGE_DISPLAY_TITLE: 'Which mantra you would like to listen to?',
    NO_MESSAGE_DISPLAY_BODY: '%s',
    HELP_MESSAGE: 'To listen %s, you can say play <break time="0.5s"/> to listen next mantra you can say Next <break time="0.5s"/> If you want to listen a specific mantra then you have to say mantra by name or number <break time="0.5s"/> What you would like to do?',
    HELP_REPROMPT: 'Tell me, what you would like to do?',
    FALLBACK_MESSAGE: '%s can\'t help you with that <break time="0.5s"/> to listen you can say play <break time="0.5s"/> what you would like to do?',
    FALLBACK_REPROMPT: 'what can I do for you?',
    ERROR_MESSAGE: 'I am sorry, I am facing some issue. Kindly try after some time',
    STOP_MESSAGE: 'Good bye! I hope you will come again <break time="1s"/> God bless you',
    PLAY_PREVIOUS_END_MESSAGE: 'you have reached at the start of the playlist',
    PLAY_NEXT_END_MESSAGE: 'you have reached at the end of the playlist',
    LOOP_ON_MEESAGE: 'loop on',
    LOOP_OFF_MEESAGE: 'loop off',
    SKILL_NOT_SUPPORTED: 'Sorry, this skill is not supported by this device',
    SKILL_NOT_SUPPORTED_DISPLAY_TITLE: 'Device Not Supported',
    SKILL_NOT_SUPPORTED_DISPLAY_BODY: 'This skill is not supported by this device'
  },
};


const languageStrings = {
  'en-IN': eninData
};


const WelcomeHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    // checks request type
    return request.type === 'LaunchRequest' ||
      (request.type === 'IntentRequest' &&
        request.intent.name === 'WelcomeIntent');
  },
  async handle(handlerInput) {
    console.log('WelcomeHandler called');

    const request = handlerInput.requestEnvelope.request;
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const pSessionAttr = handlerInput.attributesManager.getSessionAttributes();
    let speakOutput, repromptOutput, displayData, podcast_id, episode_id, episode;
    console.log('request ', JSON.stringify(request));
    console.log('pSessionAttr ', JSON.stringify(pSessionAttr));

    const playbackInfo = await getPlaybackInfo(handlerInput);
    console.log('hasPreviousPlaybackSession', playbackInfo.hasPreviousPlaybackSession);
    if (!playbackInfo.hasPreviousPlaybackSession) {
      return controller.playfirst(handlerInput);
    } else {
      playbackInfo.inPlaybackSession = false;
      speakOutput = requestAttributes.t('WELCOME_MESSAGE_REPEAT', `${podcasts.podcastEpisodeDetails.episodes[playbackInfo.playOrder[playbackInfo.index]].title}`);
      repromptOutput = requestAttributes.t('WELCOME_MESSAGE_REPEAT_REPROMPT');
      displayData = {
        title: requestAttributes.t('WELCOME_MESSAGE_REPEAT_DISPLAY_TITLE', requestAttributes.t('SKILL_NAME_DISPLAY')),
        primaryText: requestAttributes.t('WELCOME_MESSAGE_REPEAT_DISPLAY_BODY', `${podcasts.podcastEpisodeDetails.episodes[playbackInfo.playOrder[playbackInfo.index]].title}`),
        secondaryText: requestAttributes.t('WELCOME_MESSAGE_REPEAT_DISPLAY_BODY_CONTENT'),
        tertiaryText: null,
        imageUrl: BRAND_LOGO,
        templateType: 'BodyTemplate2',
        speakOutput: speakOutput
      };

      if (supportsDisplay(handlerInput)) {
        return processBodyTemplate(handlerInput, displayData, true);
      } else {
        return processStandardTemplate(handlerInput, displayData, true);
      }

    } //end else
  }, //end handler
}; // end WelcomeHandler


const PlayHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    // checks request type
    return request.type === 'IntentRequest' &&
      request.intent.name === 'PlayIntent'
  },
  async handle(handlerInput) {
    console.log('PlayHandler called');

    const request = handlerInput.requestEnvelope.request;
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const pSessionAttr = handlerInput.attributesManager.getSessionAttributes();
    let speakOutput, repromptOutput, displayData, podcast_id, episode_id, episode;
    console.log('request ', JSON.stringify(request));
    console.log('pSessionAttr ', JSON.stringify(pSessionAttr));
    const playbackInfo = await getPlaybackInfo(handlerInput);
    console.log('hasPreviousPlaybackSession', playbackInfo.hasPreviousPlaybackSession);
    if (!playbackInfo.hasPreviousPlaybackSession) {
      return controller.playfirst(handlerInput);
    } else {
      return controller.playwithprompt(handlerInput);
    }
  }, //end handler
}; // end PlayHandler



const PlayPodcastEpisodeHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'PlayPodcastEpisodeIntent'
  },
  async handle(handlerInput) {
    console.log('PlayPodcastEpisodeHandler called');

    const request = handlerInput.requestEnvelope.request;
    const pSessionAttr = handlerInput.attributesManager.getSessionAttributes();
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    let episode_id, episode;
    console.log('request ', JSON.stringify(request));
    console.log('pSessionAttr ', JSON.stringify(pSessionAttr));
    if (pSessionAttr.token) {
      episode_id = pSessionAttr.t_payload.podcast_id;
      handlerInput.attributesManager.setSessionAttributes({});
    } else {
      const slots = handlerInput.requestEnvelope.request.intent.slots;
      episode_id = resolveCanonical(slots.episode);
    }
    episode = getPodcastEpisodeDetails(episode_id);
    console.log('episode', episode);
    if (episode.id) {
      const playbackInfo = await getPlaybackInfo(handlerInput);
      playbackInfo.index = episode.index;
      playbackInfo.offsetInMilliseconds = 0;
      playbackInfo.playbackIndexChanged = true;
      playbackInfo.hasPreviousPlaybackSession = false;
      return controller.playwithprompt(handlerInput);
    } else {
      let speakOutput = requestAttributes.t('PLAY_PODCAST_INVALID_EPISODE_MESSAGE');
      let repromptOutput = requestAttributes.t('PLAY_PODCAST_INVALID_EPISODE_MESSAGE_REPEAT');
      let displayData = {
        title: requestAttributes.t(requestAttributes.t('SKILL_NAME_DISPLAY')),
        primaryText: requestAttributes.t('NO_MESSAGE_DISPLAY_TITLE'),
        secondaryText: null,
        tertiaryText: null,
        itemList: getPodcastEpisodeList(),
        imageUrl: BRAND_LOGO,
        templateType: 'ListTemplate2',
        speakOutput: speakOutput,
        repromptOutput: repromptOutput
      };

      if (supportsDisplay(handlerInput)) {
        return processListTemplate(handlerInput, displayData, true);
      } else {
        return processStandardTemplate(handlerInput, displayData, true);
      } //end if-else
    }

  } //end main handler
}; // end PlayPodcastEpisodeHandler


const PlayPodcastEposideNumberHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'PlayPodcastEpisodeNumberIntent'
  },
  async handle(handlerInput) {
    console.log('PlayPodcastEposideNumberHandler called');

    const request = handlerInput.requestEnvelope.request;
    const pSessionAttr = handlerInput.attributesManager.getSessionAttributes();
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const episode_number = slots.episode_number.value;
    let episode_id, episode;

    console.log('request ', JSON.stringify(request));
    console.log('pSessionAttr ', JSON.stringify(pSessionAttr));
    episode_id = getPodcastEpisodeId(episode_number);
    episode = getPodcastEpisodeDetails(episode_id);
    console.log('episode', episode);
    if (episode.id) {
      const playbackInfo = await getPlaybackInfo(handlerInput);
      playbackInfo.index = episode.index;
      playbackInfo.offsetInMilliseconds = 0;
      playbackInfo.playbackIndexChanged = true;
      playbackInfo.hasPreviousPlaybackSession = false;
      return controller.playwithprompt(handlerInput);
    } else {
      let speakOutput = requestAttributes.t('PLAY_PODCAST_INVALID_EPISODE_MESSAGE');
      let repromptOutput = requestAttributes.t('PLAY_PODCAST_INVALID_EPISODE_MESSAGE_REPEAT');
      let displayData = {
        title: requestAttributes.t(requestAttributes.t('SKILL_NAME_DISPLAY')),
        primaryText: requestAttributes.t('NO_MESSAGE_DISPLAY_TITLE'),
        secondaryText: null,
        tertiaryText: null,
        itemList: getPodcastEpisodeList(),
        imageUrl: BRAND_LOGO,
        templateType: 'ListTemplate2',
        speakOutput: speakOutput,
        repromptOutput: repromptOutput
      };

      if (supportsDisplay(handlerInput)) {
        return processListTemplate(handlerInput, displayData, true);
      } else {
        return processStandardTemplate(handlerInput, displayData, true);
      } //end if-else
    }

  } //end main handler
}; // end PlayPodcastEposideNumberHandler


const YesHandler = {
  async canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const playbackInfo = await getPlaybackInfo(handlerInput);
    return !playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    console.log('YesHandler called');

    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    handlerInput.attributesManager.setSessionAttributes({});
    return controller.playwithprompt(handlerInput);
  },
}; // end YesHandler


const NoHandler = {
  async canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const playbackInfo = await getPlaybackInfo(handlerInput);
    return !playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.NoIntent';
  },
  async handle(handlerInput) {
    console.log('NoHandler called');

    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    handlerInput.attributesManager.setSessionAttributes({});
    const playbackInfo = await getPlaybackInfo(handlerInput);
    playbackInfo.index = 0;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    playbackInfo.hasPreviousPlaybackSession = false;

    let speakOutput = requestAttributes.t('NO_MESSAGE');
    let repromptOutput = requestAttributes.t('NO_MESSAGE_REPEAT');
    let displayData = {
      title: requestAttributes.t(requestAttributes.t('SKILL_NAME_DISPLAY')),
      primaryText: requestAttributes.t('NO_MESSAGE_DISPLAY_TITLE'),
      secondaryText: null,
      tertiaryText: null,
      itemList: getPodcastEpisodeList(),
      imageUrl: BRAND_LOGO,
      templateType: 'ListTemplate2',
      speakOutput: speakOutput,
      speakOutput: repromptOutput
    };

    if (supportsDisplay(handlerInput)) {
      return processListTemplate(handlerInput, displayData, true);
    } else {
      return processStandardTemplate(handlerInput, displayData, true);
    }

  },
}; // end NoHandler


const AudioPlayerEventHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type.startsWith('AudioPlayer.');
  },
  async handle(handlerInput) {
    console.log('AudioPlayerEventHandler called');

    const {
      requestEnvelope,
      attributesManager,
      responseBuilder
    } = handlerInput;
    const audioPlayerEventName = requestEnvelope.request.type.split('.')[1];
    const {
      playbackSetting,
      playbackInfo
    } = await attributesManager.getPersistentAttributes();

    console.log('audioPlayerEventName ', audioPlayerEventName);
    switch (audioPlayerEventName) {
      case 'PlaybackStarted':
        playbackInfo.token = getToken(handlerInput);
        playbackInfo.index = await getIndex(handlerInput);
        playbackInfo.inPlaybackSession = true;
        playbackInfo.hasPreviousPlaybackSession = true;
        break;
      case 'PlaybackFinished':
        playbackInfo.inPlaybackSession = false;
        playbackInfo.hasPreviousPlaybackSession = false;
        playbackInfo.nextStreamEnqueued = false;
        break;
      case 'PlaybackStopped':
        playbackInfo.token = getToken(handlerInput);
        playbackInfo.index = await getIndex(handlerInput);
        playbackInfo.offsetInMilliseconds = getOffsetInMilliseconds(handlerInput);
        break;
      case 'PlaybackNearlyFinished': {
        if (playbackInfo.nextStreamEnqueued) {
          break;
        }

        // const enqueueIndex = (playbackInfo.index + 1) % constants.audioData.length;
        const enqueueIndex = (playbackInfo.index + 1) % podcasts.podcastEpisodeDetails.episodes.length;

        if (enqueueIndex === 0 && !playbackSetting.loop) {
          break;
        }

        playbackInfo.nextStreamEnqueued = true;

        const enqueueToken = playbackInfo.playOrder[enqueueIndex];
        const playBehavior = 'ENQUEUE';
        // const podcast = constants.audioData[playbackInfo.playOrder[enqueueIndex]];
        const podcast = podcasts.podcastEpisodeDetails.episodes[playbackInfo.playOrder[enqueueIndex]];
        const expectedPreviousToken = playbackInfo.token;
        const offsetInMilliseconds = 0;
        console.log('episode url ', podcast.url + podcasts.podcastEpisodes.param);
        const audioItemMetadata = {
          title: podcast.title,
          subtitle: podcast.description,
          art: new Alexa.ImageHelper().withDescription(podcast.title).addImageInstance(podcast.image).getImage(),
          backgroundImage: new Alexa.ImageHelper().withDescription(podcast.title).addImageInstance(podcast.image).getImage()
        };
        responseBuilder.addAudioPlayerPlayDirective(
          playBehavior,
          podcast.url + podcasts.podcastEpisodes.param,
          enqueueToken,
          offsetInMilliseconds,
          expectedPreviousToken,
          audioItemMetadata
        );
        break;
      }
      case 'PlaybackFailed':
        playbackInfo.inPlaybackSession = false;
        console.log('Playback Failed : %j', handlerInput.requestEnvelope.request.error);
        return;
      default:
        throw new Error('Check this --- Should never reach here!');
    }

    return responseBuilder.getResponse();
  },
}; //end AudioPlayerEventHandler


const StartPlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;
    console.log('inPlaybackSession', playbackInfo.inPlaybackSession);
    if (!playbackInfo.inPlaybackSession) {
      return request.type === 'IntentRequest' && request.intent.name === 'PlayAudio';
    }
    if (request.type === 'PlaybackController.PlayCommandIssued') {
      return true;
    }

    if (request.type === 'IntentRequest') {
      return request.intent.name === 'PlayAudio' ||
        request.intent.name === 'AMAZON.ResumeIntent';
    }
  },
  handle(handlerInput) {
    console.log('StartPlaybackHandler called');
    return controller.play(handlerInput);
  },
}; // end StartPlaybackHandler


const NextPlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;
    console.log('inPlaybackSession', playbackInfo.inPlaybackSession);
    return playbackInfo.inPlaybackSession &&
      (request.type === 'PlaybackController.NextCommandIssued' ||
        (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NextIntent'));
  },
  handle(handlerInput) {
    console.log('NextPlaybackHandler called');
    return controller.playNext(handlerInput);
  },
}; // end NextPlaybackHandler


const PreviousPlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;
    console.log('inPlaybackSession', playbackInfo.inPlaybackSession);
    return playbackInfo.inPlaybackSession &&
      (request.type === 'PlaybackController.PreviousCommandIssued' ||
        (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.PreviousIntent'));
  },
  handle(handlerInput) {
    console.log('PreviousPlaybackHandler called');
    return controller.playPrevious(handlerInput);
  },
}; //end PreviousPlaybackHandler



const PausePlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;
    console.log('inPlaybackSession', playbackInfo.inPlaybackSession);
    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.StopIntent' ||
        request.intent.name === 'AMAZON.CancelIntent' ||
        request.intent.name === 'AMAZON.PauseIntent');
  },
  handle(handlerInput) {
    console.log('PausePlaybackHandler called');
    return controller.stop(handlerInput);
  },
}; //end PausePlaybackHandler


const LoopOnHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.LoopOnIntent';
  },
  async handle(handlerInput) {
    console.log('LoopOnHandler called');

    const playbackSetting = await handlerInput.attributesManager.getPersistentAttributes().playbackSetting;
    playbackSetting.loop = true;

    return handlerInput.responseBuilder
      .speak(handlerInput.attributesManager.getRequestAttributes().t('LOOP_ON_MEESAGE'))
      .getResponse();
  },
}; //end LoopOnHandler


const LoopOffHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.LoopOffIntent';
  },
  async handle(handlerInput) {
    console.log('LoopOffHandler called');
    const playbackSetting = await handlerInput.attributesManager.getPersistentAttributes().playbackSetting;

    playbackSetting.loop = false;

    return handlerInput.responseBuilder
      .speak(handlerInput.attributesManager.getRequestAttributes().t('LOOP_OFF_MEESAGE'))
      .getResponse();
  },
}; //end LoopOffHandler


const ShuffleOnHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.ShuffleOnIntent';
  },
  async handle(handlerInput) {
    console.log('ShuffleOnHandler called');
    const {
      playbackInfo,
      playbackSetting,
    } = await handlerInput.attributesManager.getPersistentAttributes();

    playbackSetting.shuffle = true;
    playbackInfo.playOrder = await shuffleOrder();
    playbackInfo.index = 0;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    return controller.play(handlerInput);
  },
}; //end ShuffleOnHandler


const ShuffleOffHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.ShuffleOffIntent';
  },
  async handle(handlerInput) {
    console.log('ShuffleOffHandler called');
    const {
      playbackInfo,
      playbackSetting,
    } = await handlerInput.attributesManager.getPersistentAttributes();

    if (playbackSetting.shuffle) {
      playbackSetting.shuffle = false;
      playbackInfo.index = playbackInfo.playOrder[playbackInfo.index];
      // playbackInfo.playOrder = [...Array(constants.audioData.length).keys()];
      playbackInfo.playOrder = [...Array(podcasts.podcastEpisodes.episodes.length).keys()];
    }

    return controller.play(handlerInput);
  },
}; //end ShuffleOffHandler


const StartOverHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.StartOverIntent';
  },
  async handle(handlerInput) {
    console.log('StartOverHandler called');
    const playbackInfo = await handlerInput.attributesManager.getPersistentAttributes().playbackInfo;
    playbackInfo.offsetInMilliseconds = 0;
    return controller.play(handlerInput);
  },
}; //end StartOverHandler



const CheckAudioInterfaceHandler = {
  async canHandle(handlerInput) {
    const audioPlayerInterface = ((((handlerInput.requestEnvelope.context || {}).System || {}).device || {}).supportedInterfaces || {}).AudioPlayer;
    return audioPlayerInterface === undefined
  },
  handle(handlerInput) {
    console.log('CheckAudioInterfaceHandler called');
    const request = handlerInput.requestEnvelope.request;
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const pSessionAttr = handlerInput.attributesManager.getSessionAttributes();
    let speakOutput = requestAttributes.t('SKILL_NOT_SUPPORTED');

    console.log('request ', JSON.stringify(request));
    console.log('pSessionAttr ', JSON.stringify(pSessionAttr));

    displayData = {
      title: requestAttributes.t('SKILL_NOT_SUPPORTED_DISPLAY_TITLE'),
      primaryText: requestAttributes.t('SKILL_NOT_SUPPORTED_DISPLAY_BODY'),
      secondaryText: null,
      tertiaryText: null,
      imageUrl: BRAND_LOGO,
      templateType: 'BodyTemplate2',
      speakOutput: speakOutput
    };

    if (supportsDisplay(handlerInput)) {
      return processBodyTemplate(handlerInput, displayData, false);
    } else {
      return processStandardTemplate(handlerInput, displayData, false);
    } // end else

  },
}; //CheckAudioInterfaceHandler



const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    console.log('HelpHandler called');
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('HELP_MESSAGE', requestAttributes.t('SKILL_NAME')))
      .reprompt(requestAttributes.t('HELP_REPROMPT'))
      .getResponse();
  },
}; // end help handler



const FallbackHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.FallbackIntent' ||
      request.intent.name === 'FallbackIntent'
  },
  handle(handlerInput) {
    console.log('FallbackHandler called');

    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    console.log('requestAttributes ', JSON.stringify(requestAttributes));

    return handlerInput.responseBuilder
      .speak(requestAttributes.t('FALLBACK_MESSAGE', requestAttributes.t('SKILL_NAME')))
      .reprompt(requestAttributes.t('FALLBACK_REPROMPT'))
      .getResponse();
  },
}; // end fallback handler



const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.CancelIntent' ||
        request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    console.log('ExitHandler called');
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('STOP_MESSAGE'))
      .getResponse();
  },
}; // end exit handler


const ResumeHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.ResumeIntent';
  },
  handle(handlerInput) {
    console.log('ResumeHandler called');
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return controller.play(handlerInput);
  },
}; // end resume handler



const SystemExceptionHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'System.ExceptionEncountered';
  },
  handle(handlerInput) {
    console.log('SystemExceptionHandler called');
    console.log(`System exception encountered: ${handlerInput.requestEnvelope.request.reason}`);
  },
}; //end system exception handler



const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log('SessionEndedRequestHandler called');
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
}; // end session handler



const ErrorHandler = {
  canHandle(handlerInput) {
    return true;
  },
  handle(handlerInput, error) {
    console.log('ErrorHandler called');
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('ERROR_MESSAGE'))
      .getResponse();
  },
}; // end error handler



const ElementSelectedHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'Display.ElementSelected';
  },
  handle(handlerInput) {
    console.log('ElementSelectedHandler called');

    const request = handlerInput.requestEnvelope.request;
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    console.log('request ', JSON.stringify(request));
    console.log('currentIntent ', JSON.stringify(currentIntent));

    gTokenData = tokenizer(request.token);
    console.log('gTokenData ', JSON.stringify(gTokenData));
    handlerInput.attributesManager.setSessionAttributes({
      'token': true,
      't_intent': gTokenData.intent,
      't_payload': gTokenData.payload
    });

    if (gTokenData.intent === 'YesIntent') {
      return YesHandler.handle(handlerInput);
    } else if (gTokenData.intent === 'NoIntent') {
      return NoHandler.handle(handlerInput);
    } else if (gTokenData.intent === 'PlayPodcastEpisodeIntent') {
      return PlayPodcastEpisodeHandler.handle(handlerInput);
    } else {
      console.log('unhandled intent based on then token');
    }
  },
}; // end elementselect handler




const LocalizationInterceptor = {
  process(handlerInput) {
    console.log('LocalizationInterceptor');
    console.log('LocalizationInterceptor::request ', JSON.stringify(handlerInput.requestEnvelope));
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    console.log('requestAttributes ', JSON.stringify(requestAttributes));

    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      resources: languageStrings
    });
    localizationClient.localize = function localize() {
      const args = arguments;
      // console.log('args', args);
      const values = [];
      for (let i = 1; i < args.length; i += 1) {
        values.push(args[i]);
      }
      // console.log('values', values);
      const value = i18n.t(args[0], {
        returnObjects: true,
        postProcess: 'sprintf',
        sprintf: values,
      });
      if (Array.isArray(value)) {
        return value[Math.floor(Math.random() * value.length)];
      }
      // console.log('value', value);
      return value;
    };
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function translate(...args) {
      return localizationClient.localize(...args);
    };
  },
}; // end LocalizationInterceptor



const LoadPersistentAttributesRequestInterceptor = {
  async process(handlerInput) {
    console.log('LoadPersistentAttributesRequestInterceptor called');

    const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();
    // Check if user is invoking the skill the first time and initialize preset values
    if (Object.keys(persistentAttributes).length === 0) {
      handlerInput.attributesManager.setPersistentAttributes({
        playbackSetting: {
          loop: false,
          shuffle: false,
        },
        playbackInfo: {
          // playOrder: [...Array(constants.audioData.length).keys()],
          playOrder: [...Array(podcasts.podcastEpisodes.episodes.length).keys()],
          index: 0,
          offsetInMilliseconds: 0,
          playbackIndexChanged: true,
          token: '',
          nextStreamEnqueued: false,
          inPlaybackSession: false,
          hasPreviousPlaybackSession: false,
        },
      });
    }
  },
}; // end LoadPersistentAttributesRequestInterceptor



const SavePersistentAttributesResponseInterceptor = {
  async process(handlerInput) {
    console.log('SavePersistentAttributesResponseInterceptor called');

    await handlerInput.attributesManager.savePersistentAttributes();
  },
}; // end SavePersistentAttributesResponseInterceptor



/*Utility Functions*/

function supportsDisplay(handlerInput) {
  console.log('supportsDisplay called');

  var hasDisplay =
    handlerInput.requestEnvelope.context &&
    handlerInput.requestEnvelope.context.System &&
    handlerInput.requestEnvelope.context.System.device &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display;

  console.log('is display device ', hasDisplay);
  return hasDisplay;
}; //end supportsDisplay


function processListTemplate(handlerInput, displayData, isReprompt) {
  console.log('processListTemplate called');

  let image = new Alexa.ImageHelper().addImageInstance(displayData.imageUrl).getImage();
  let itemsList = [];
  for (var l = 0; l < displayData.itemList.length; l++) {
    itemsList.push({
      token: displayData.itemList[l].token,
      image: new Alexa.ImageHelper().addImageInstance(displayData.itemList[l].image).getImage(),
      textContent: new Alexa.RichTextContentHelper()
        .withPrimaryText(displayData.itemList[l].primaryText)
        .withSecondaryText(displayData.itemList[l].secondaryText)
        .withTertiaryText(displayData.itemList[l].tertiaryText)
        .getTextContent()
    });
  };

  if (isReprompt) {
    return handlerInput.responseBuilder
      .speak(displayData.speakOutput)
      .reprompt(displayData.repromptOutput)
      .addRenderTemplateDirective({
        type: displayData.templateType,
        token: Math.floor(Math.random() * 1000000),
        backButton: 'visible',
        image: image,
        title: displayData.title,
        listItems: itemsList,
      })
      .getResponse();
  } else {
    return handlerInput.responseBuilder
      .speak(displayData.speakOutput)
      .addRenderTemplateDirective({
        type: displayData.templateType,
        token: Math.floor(Math.random() * 1000000),
        backButton: 'visible',
        image: image,
        title: displayData.title,
        listItems: itemsList,
      })
      .getResponse();
  }

}; // end processListTemplate1


function processBodyTemplate(handlerInput, displayData, isReprompt) {
  console.log('processBodyTemplate called');

  let image = new Alexa.ImageHelper().addImageInstance(displayData.imageUrl).getImage();
  let textContent = new Alexa.RichTextContentHelper()
    .withPrimaryText(displayData.primaryText)
    .withSecondaryText(displayData.secondaryText)
    .withTertiaryText(displayData.tertiaryText)
    .getTextContent();

  if (isReprompt) {
    return handlerInput.responseBuilder
      .speak(displayData.speakOutput)
      .reprompt(displayData.repromptOutput)
      .addRenderTemplateDirective({
        type: displayData.templateType,
        token: Math.floor(Math.random() * 1000000),
        backButton: 'visible',
        image: image,
        title: displayData.title,
        textContent: textContent,
      })
      .getResponse();
  } else {
    return handlerInput.responseBuilder
      .speak(displayData.speakOutput)
      .addRenderTemplateDirective({
        type: displayData.templateType,
        token: Math.floor(Math.random() * 1000000),
        backButton: 'visible',
        image: image,
        title: displayData.title,
        textContent: textContent,
      })
      .getResponse();
  }

}; // end processBodyTemplate


function processStandardTemplate(handlerInput, displayData, isReprompt) {
  console.log('processStandardTemplate called');

  if (isReprompt) {
    return handlerInput.responseBuilder
      .speak(displayData.speakOutput)
      .reprompt(displayData.repromptOutput)
      .withStandardCard(displayData.title, striptags(displayData.primaryText, [], '\n'), displayData.imageUrl)
      .getResponse();
  } else {
    return handlerInput.responseBuilder
      .speak(displayData.speakOutput)
      .withStandardCard(displayData.title, striptags(displayData.primaryText, [], '\n'), displayData.imageUrl)
      .getResponse();
  }

}; // end processStandardTemplate


async function getPlaybackInfo(handlerInput) {
  console.log('getPlaybackInfo called');

  const attributes = await handlerInput.attributesManager.getPersistentAttributes();
  return attributes.playbackInfo;
}


async function canThrowCard(handlerInput) {
  console.log('canThrowCard called');
  const {
    requestEnvelope,
    attributesManager
  } = handlerInput;
  const playbackInfo = await getPlaybackInfo(handlerInput);
  console.log('request type ', requestEnvelope.request.type, 'playback index changed', playbackInfo.playbackIndexChanged);

  if (requestEnvelope.request.type === 'IntentRequest' && playbackInfo.playbackIndexChanged) {
    playbackInfo.playbackIndexChanged = false;
    return true;
  }
  return false;
} //end canThrowCard


const controller = {
  async play(handlerInput) {
    console.log('play called');
    const {
      attributesManager,
      responseBuilder
    } = handlerInput;

    const playbackInfo = await getPlaybackInfo(handlerInput);
    const {
      playOrder,
      offsetInMilliseconds,
      index
    } = playbackInfo;

    const playBehavior = 'REPLACE_ALL';
    // const podcast = constants.audioData[playOrder[index]];
    const podcast = podcasts.podcastEpisodeDetails.episodes[playOrder[index]];
    const token = playOrder[index];
    console.log('token', index);
    console.log('episode url ', podcast.url + podcasts.podcastEpisodes.param);
    playbackInfo.nextStreamEnqueued = false;
    const audioItemMetadata = {
      title: podcast.title,
      subtitle: podcast.description,
      art: new Alexa.ImageHelper().withDescription(podcast.title).addImageInstance(podcast.image).getImage(),
      backgroundImage: new Alexa.ImageHelper().withDescription(podcast.title).addImageInstance(podcast.image).getImage()
    };
    responseBuilder
      .withShouldEndSession(true)
      .addAudioPlayerPlayDirective(
        playBehavior,
        podcast.url + podcasts.podcastEpisodes.param,
        token,
        offsetInMilliseconds,
        null,
        audioItemMetadata);

    if (await canThrowCard(handlerInput)) {
      console.log('play render card');
      const cardTitle = `${podcast.title}`;
      const cardContent = `${podcast.description}`;
      responseBuilder.withSimpleCard(cardTitle, cardContent);
    }

    return responseBuilder.getResponse();
  },
  async playfirst(handlerInput) {
    console.log('playfirst called');

    const {
      attributesManager,
      responseBuilder
    } = handlerInput;

    const playbackInfo = await getPlaybackInfo(handlerInput);
    playbackInfo.index = 0;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    playbackInfo.hasPreviousPlaybackSession = false;
    const {
      playOrder,
      offsetInMilliseconds,
      index
    } = playbackInfo;

    const playBehavior = 'REPLACE_ALL';
    // const podcast = constants.audioData[playOrder[index]];
    const podcast = podcasts.podcastEpisodeDetails.episodes[playOrder[index]];
    const token = playOrder[index];
    console.log('token', index);
    playbackInfo.nextStreamEnqueued = false;
    const audioItemMetadata = {
      title: podcast.title,
      subtitle: podcast.description,
      art: new Alexa.ImageHelper().withDescription(podcast.title).addImageInstance(podcast.image).getImage(),
      backgroundImage: new Alexa.ImageHelper().withDescription(podcast.title).addImageInstance(podcast.image).getImage()
    };

    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    let speakOutput = requestAttributes.t('WELCOME_MESSAGE', requestAttributes.t('SKILL_NAME'), requestAttributes.t('SKILL_NAME'), ` ${podcast.title}`);
    let speakOutputMore = requestAttributes.t('EPISODE_SUMMARY', `${podcast.description}`)

    let displayData = {
      title: requestAttributes.t('WELCOME_MESSAGE_DISPLAY_TITLE', requestAttributes.t('SKILL_NAME_DISPLAY'), requestAttributes.t('SKILL_NAME_DISPLAY')),
      primaryText: requestAttributes.t('WELCOME_MESSAGE_DISPLAY_BODY', requestAttributes.t('SKILL_NAME'), requestAttributes.t('SKILL_NAME')),
      secondaryText: requestAttributes.t('WELCOME_MESSAGE_DISPLAY_BODY_CONTENT', `${podcast.title}`),
      tertiaryText: requestAttributes.t('EPISODE_SUMMARY_DISPLAY_BODY', `${podcast.description}`),
      imageUrl: BRAND_LOGO,
      templateType: 'BodyTemplate2'
    };
    console.log('episode url ', podcast.url + podcasts.podcastEpisodes.param);
    let image = new Alexa.ImageHelper().addImageInstance(displayData.imageUrl).getImage();
    let textContent = new Alexa.RichTextContentHelper()
      .withPrimaryText(displayData.primaryText)
      .withSecondaryText(displayData.secondaryText)
      .withTertiaryText(displayData.tertiaryText)
      .getTextContent();

    responseBuilder
      .speak(speakOutput + speakOutputMore)
      .withShouldEndSession(true)
      .addAudioPlayerPlayDirective(
        playBehavior,
        podcast.url + podcasts.podcastEpisodes.param,
        token,
        offsetInMilliseconds,
        null,
        audioItemMetadata);

    if (supportsDisplay(handlerInput)) {
      responseBuilder.addRenderTemplateDirective({
        type: displayData.templateType,
        backButton: 'visible',
        image: image,
        title: displayData.title,
        textContent: textContent,
      });
    }

    if (await canThrowCard(handlerInput)) {
      console.log('playfirst render card');
      const cardTitle = requestAttributes.t('EPISODE_SUMMARY_DISPLAY_TITLE', `${podcast.title}`);
      const cardContent = requestAttributes.t('EPISODE_SUMMARY_DISPLAY_BODY', `${podcast.description}`);
      responseBuilder.withSimpleCard(cardTitle, cardContent);
    }

    return responseBuilder.getResponse();
  },
  async playwithprompt(handlerInput) {
    console.log('playwithprompt called');
    const {
      attributesManager,
      responseBuilder
    } = handlerInput;

    const playbackInfo = await getPlaybackInfo(handlerInput);
    const {
      playOrder,
      offsetInMilliseconds,
      index
    } = playbackInfo;

    const playBehavior = 'REPLACE_ALL';
    // const podcast = constants.audioData[playOrder[index]];
    const podcast = podcasts.podcastEpisodeDetails.episodes[playOrder[index]];
    const token = playOrder[index];
    console.log('token', index);
    playbackInfo.nextStreamEnqueued = false;
    const audioItemMetadata = {
      title: podcast.title,
      subtitle: podcast.description,
      art: new Alexa.ImageHelper().withDescription(podcast.title).addImageInstance(podcast.image).getImage(),
      backgroundImage: new Alexa.ImageHelper().withDescription(podcast.title).addImageInstance(podcast.image).getImage()
    };

    console.log('episode url ', podcast.url + podcasts.podcastEpisodes.param);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    let speakOutput = requestAttributes.t('PLAY_PODCAST_EPISODE_MESSAGE', ` ${podcast.title}`);
    let speakOutputMore = requestAttributes.t('EPISODE_SUMMARY', `${podcast.description}`)
    responseBuilder
      .speak(speakOutput + speakOutputMore)
      .withShouldEndSession(true)
      .addAudioPlayerPlayDirective(
        playBehavior,
        podcast.url + podcasts.podcastEpisodes.param,
        token,
        offsetInMilliseconds,
        null,
        audioItemMetadata);

    if (await canThrowCard(handlerInput)) {
      console.log('play render card');
      const cardTitle = `${podcast.title}`;
      const cardContent = `${podcast.description}`;
      responseBuilder.withSimpleCard(cardTitle, cardContent);
    }

    return responseBuilder.getResponse();
  },
  stop(handlerInput) {
    console.log('stop called');
    return handlerInput.responseBuilder
      .addAudioPlayerStopDirective()
      .getResponse();
  },
  async playNext(handlerInput) {
    console.log('playNext called');
    const {
      playbackInfo,
      playbackSetting,
    } = await handlerInput.attributesManager.getPersistentAttributes();
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    // const nextIndex = (playbackInfo.index + 1) % constants.audioData.length;
    const nextIndex = (playbackInfo.index + 1) % podcasts.podcastEpisodeDetails.episodes.length;

    console.log('nextIndex ', nextIndex)
    if (nextIndex === 0 && !playbackSetting.loop) {
      return handlerInput.responseBuilder
        .addAudioPlayerStopDirective()
        .getResponse();
    }

    playbackInfo.index = nextIndex;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;

    return this.play(handlerInput);
  },
  async playPrevious(handlerInput) {
    console.log('playPrevious called');
    const {
      playbackInfo,
      playbackSetting,
    } = await handlerInput.attributesManager.getPersistentAttributes();
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    let previousIndex = playbackInfo.index - 1;

    console.log('previousIndex ', previousIndex);
    if (previousIndex === -1) {
      if (playbackSetting.loop) {
        // previousIndex += constants.audioData.length;
        previousIndex += podcasts.podcastEpisodeDetails.episodes.length;
      } else {
        return handlerInput.responseBuilder
          .addAudioPlayerStopDirective()
          .getResponse();
      }
    }

    playbackInfo.index = previousIndex;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;

    return this.play(handlerInput);
  },
}; //end controller


function shuffleOrder() {
  // const array = [...Array(constants.audioData.length).keys()];
  const array = [...Array(podcasts.podcastEpisodes.episodes.length).keys()];
  let currentIndex = array.length;
  let temp;
  let randomIndex;
  // Algorithm : Fisher-Yates shuffle
  return new Promise((resolve) => {
    while (currentIndex >= 1) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temp = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temp;
    }
    resolve(array);
  });
} //end shuffleOrder


function getToken(handlerInput) {
  console.log('getToken called');
  return handlerInput.requestEnvelope.request.token;
} //end getToken


async function getIndex(handlerInput) {
  console.log('getIndex called');
  const tokenValue = parseInt(handlerInput.requestEnvelope.request.token, 10);
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();

  return attributes.playbackInfo.playOrder.indexOf(tokenValue);
}


function getOffsetInMilliseconds(handlerInput) {
  console.log('getOffsetInMilliseconds called');
  return handlerInput.requestEnvelope.request.offsetInMilliseconds;
}


function getPodcastId() {
  console.log('getPodcastId called');

  return podcasts.podcastEpisodes.id;
}; // end getPodcastId


function getPodcastEpisodeId(episodeNumber) {
  console.log('getPodcastEpisodeNumber called');
  console.log('episodeNumber', episodeNumber);

  if (parseInt(episodeNumber)) {
    return podcasts.podcastEpisodeDetails.episodes[episodeNumber - 1].id;
  } else {
    return null;
  }

}; //end getPodcastEpisodeId


function getPodcastEpisodeDetails(episodeId) {
  console.log('getPodcastEpisodeDetails called');
  console.log('episodeId', episodeId);
  let episode = {};

  if (episodeId) {
    for (var j = 0; j < podcasts.podcastEpisodeDetails.episodes.length; j++) {
      if (episodeId == podcasts.podcastEpisodeDetails.episodes[j].id) {
        console.log('episode id exists!!');
        episode = {
          'episode': podcasts.podcastEpisodeDetails.episodes[j],
          'id': podcasts.podcastEpisodeDetails.episodes[j].id,
          'index': j
        };
        return episode;
      }
    }
  } else {
    return episode;
  }

}; //end getPodcastEpisodeDetails


function getPodcastEpisodeList() {
  console.log('getPodcastEpisodeList called');
  let episodeNames = [];

  for (var k = 0; k < podcasts.podcastEpisodeDetails.episodes.length; k++) {
    for (var j = 0; j < podcasts.podcastEpisodes.episodes.length; j++) {
      if (podcasts.podcastEpisodes.episodes[j] === podcasts.podcastEpisodeDetails.episodes[k].id) {
        episodeNames.push({
          id: podcasts.podcastEpisodeDetails.episodes[k].id,
          token: 'PlayPodcastEpisodeIntent' + '_' + podcasts.podcastEpisodeDetails.episodes[k].id,
          image: podcasts.podcastEpisodeDetails.episodes[k].image,
          primaryText: podcasts.podcastEpisodeDetails.episodes[k].title,
          secondaryText: null,
          tertiaryText: null
        });
      }
    }
  }

  episodeNames.sort(function(a, b) {
    return a.id - b.id;
  });

  return episodeNames;
}; //end getPodcastEpisodeList


function resolveCanonical(slot) {
  console.log('resolveCanonical for ', slot.value);

  let canonical = slot.value,
    canonical_id;
  try {
    if (slot.resolutions) {
      var status_code = slot.resolutions.resolutionsPerAuthority[0].status.code;
      console.log('check slot resolutions for status ', status_code);

      if (status_code === 'ER_SUCCESS_MATCH') {
        canonical = slot.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        canonical_id = slot.resolutions.resolutionsPerAuthority[0].values[0].value.id
      }
    }
  } catch (err) {
    console.log('resolveCanonical error', err.message);
  };

  return canonical_id;
};


function tokenizer(token) {
  console.log('tokenizer called');

  var token_data = token.split("_");
  var tokenizerObj = {
    'intent': token_data[0],
    'payload': {
      'podcast_id': token_data[1],
      'episode_id': token_data[2]
    }
  }
  return tokenizerObj;
}; // end tokenizer

/*Utility Functions*/


const skillBuilder = Alexa.SkillBuilders.standard();
exports.handler = skillBuilder
  .addRequestHandlers(
    CheckAudioInterfaceHandler,
    WelcomeHandler,
    PlayHandler,
    HelpHandler,
    SessionEndedRequestHandler,
    SystemExceptionHandler,
    YesHandler,
    NoHandler,
    StartPlaybackHandler,
    NextPlaybackHandler,
    PreviousPlaybackHandler,
    PausePlaybackHandler,
    LoopOnHandler,
    LoopOffHandler,
    ShuffleOnHandler,
    ShuffleOffHandler,
    StartOverHandler,
    PlayPodcastEpisodeHandler,
    PlayPodcastEposideNumberHandler,
    ResumeHandler,
    ExitHandler,
    AudioPlayerEventHandler,
    ElementSelectedHandler,
    FallbackHandler
  )
  .addRequestInterceptors(LoadPersistentAttributesRequestInterceptor, LocalizationInterceptor)
  .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withAutoCreateTable(true)
  .withTableName(tableName)
  .lambda();