import {
	call,
	put,
	select,
	takeLatest,
	race
} from 'redux-saga/effects'
import { delay } from 'redux-saga'
import Device from 'react-native-device-info'
import firebase from 'react-native-firebase'

import MessagesService from '../services/messagesService'
import logger from '../util/logger'
import { MESSAGING_TTL } from '../AppSettings'

const getUserData = state => (state.user)

function* getTopics() {
	try {
		yield put({ type: 'GET_TOPICS_REQUEST' })

		const { response, timeout } = yield race({
			response: call(MessagesService.FetchTopics),
			timeout: call(delay, MESSAGING_TTL)
		})

		if (timeout) {
			const e = new Error('Request timed out.')
			throw e
		}
		else if (response) {
			yield put({ type: 'SET_TOPICS', topics: response })
			yield put({ type: 'GET_TOPICS_SUCCESS' })
		}
	} catch (error) {
		yield put({ type: 'GET_TOPICS_FAILED', error })
		logger.trackException(error, false)
	}
}

function* registerToken(action) {
	const { token } = action
	const { isLoggedIn } = yield select(getUserData)

	if (isLoggedIn) {
		try {
			yield put({ type: 'POST_TOKEN_REQUEST' })

			const { response, timeout } = yield race({
				response: call(MessagesService.PostPushToken, token, Device.getUniqueID()),
				timeout: call(delay, MESSAGING_TTL)
			})

			if (timeout) {
				const e = new Error('Request timed out.')
				throw e
			}
			else if (response) {
				yield put({ type: 'CONFIRM_REGISTRATION' })
				yield put({ type: 'POST_TOKEN_SUCCESS' })
			}
		} catch (error) {
			yield put({ type: 'POST_TOKEN_FAILED', error })
			logger.trackException(error, false)
		}
	}
}

function* unregisterToken(action) {
	const { accessToken } = action
	const fcmToken = yield firebase.messaging().getToken()

	try {
		yield put({ type: 'POST_TOKEN_REQUEST' })

		const { response, timeout } = yield race({
			response: call(MessagesService.DeletePushToken, fcmToken, accessToken),
			timeout: call(delay, MESSAGING_TTL)
		})

		if (timeout) {
			const e = new Error('Request timed out.')
			throw e
		}
		else if (response) {
			yield put({ type: 'CONFIRM_DEREGISTRATION' })
			yield put({ type: 'POST_TOKEN_SUCCESS' })
		}
	} catch (error) {
		yield put({ type: 'POST_TOKEN_FAILED', error })
		logger.trackException(error, false)
	}
}

function* updateMessages(action) {
	const { timestamp } = action
	const { isLoggedIn } = yield select(getUserData)

	if (isLoggedIn) {
		try {
			yield put({ type: 'GET_MESSAGES_REQUEST' })

			const { response, timeout } = yield race({
				response: call(MessagesService.FetchMyMessages, timestamp),
				timeout: call(delay, MESSAGING_TTL)
			})

			if (timeout) {
				const e = new Error('Request timed out.')
				throw e
			}
			else {
				const { messages, next: nextTimestamp } = response

				yield put({ type: 'SET_MESSAGES', messages, nextTimestamp })
				yield put({ type: 'GET_MESSAGES_SUCCESS' })
			}
		} catch (error) {
			yield put({ type: 'GET_MESSAGES_FAILURE', error })
			logger.trackException(error, false)
		}
	}
}

function* loadMoreMessages(action) {
	const { timestamp } = action
	const { isLoggedIn } = yield select(getUserData)

	if (isLoggedIn) {
		try {
			yield put({ type: 'GET_MESSAGES_REQUEST' })

			const { response, timeout } = yield race({
				response: call(MessagesService.FetchMyMessages, timestamp),
				timeout: call(delay, MESSAGING_TTL)
			})

			if (timeout) {
				const e = new Error('Request timed out.')
				throw e
			}
			else {
				const { messages, next: nextTimestamp } = response

				yield put({ type: 'ADD_MESSAGES', messages, nextTimestamp })
				yield put({ type: 'GET_MESSAGES_SUCCESS' })
			}
		} catch (error) {
			yield put({ type: 'GET_MESSAGES_FAILURE', error })
			logger.trackException(error, false)
		}
	}
}

function* subscribeToTopic(action) {
	const { topicId } = action
	const { profile } = yield select(getUserData)

	let newTopicSubscriptions = []
	if (Array.isArray(profile.subscribedTopics)) {
		newTopicSubscriptions = [...profile.subscribedTopics]
	}
	newTopicSubscriptions.push(topicId)
	const profileItems = { subscribedTopics: newTopicSubscriptions }

	yield firebase.messaging().subscribeToTopic(topicId)
	yield put({ type: 'MODIFY_LOCAL_PROFILE', profileItems })
}

function* unsubscribeFromTopic(action) {
	const { topicId } = action
	const { profile } = yield select(getUserData)

	let newTopicSubscriptions = []
	if (Array.isArray(profile.subscribedTopics)) {
		newTopicSubscriptions = [...profile.subscribedTopics]
	}
	const topicIndex = newTopicSubscriptions.indexOf(topicId)
	newTopicSubscriptions.splice(topicIndex, 1)
	const profileItems = { subscribedTopics: newTopicSubscriptions }

	yield firebase.messaging().unsubscribeFromTopic(topicId)
	yield put({ type: 'MODIFY_LOCAL_PROFILE', profileItems })
}

function* messagesSaga() {
	yield takeLatest('UPDATE_MESSAGES', updateMessages)
	yield takeLatest('LOAD_MORE_MESSAGES', loadMoreMessages)
	yield takeLatest('REGISTER_TOKEN', registerToken)
	yield takeLatest('UNREGISTER_TOKEN', unregisterToken)
	yield takeLatest('GET_TOPICS', getTopics)
	yield takeLatest('SUBSCRIBE_TO_TOPIC', subscribeToTopic)
	yield takeLatest('UNSUBSCRIBE_FROM_TOPIC', unsubscribeFromTopic)
}

export default messagesSaga