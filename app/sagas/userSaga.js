import {
	call,
	put,
	takeLatest,
	race,
	select
} from 'redux-saga/effects'
import { delay } from 'redux-saga'
import { Alert } from 'react-native'

import ssoService from '../services/ssoService'
import { SSO_TTL, SSO_IDP_ERROR_RETRY_INCREMENT } from '../AppSettings'
import logger from '../util/logger'

const auth = require('../util/auth')

const userState = state => (state.user)

function* doLogin(action) {
	const { username, password } = action

	if ((username === 'studentdemo' && password === 'studentdemo') ||
		(username === 'demo' && password === 'demo')) {
		// DEMO ACCOUNT LOGIN
		yield activateDemoAccount(username, password)
	} else {
		// NORMAL LOGIN
		yield put({ type: 'LOG_IN_REQUEST' })
		try {
			if (!password || password.length === 0) {
				const e = new Error('Please type in your password.')
				e.name = 'emptyPasswordError'
				yield call(delay, 0)
				throw e
			}
			const passwordEncrypted = yield auth.encryptStringWithKey(password)
			const loginInfo = auth.encryptStringWithBase64(`${username}:${passwordEncrypted}`)

			const { response, timeout } = yield race({
				response: call(ssoService.retrieveAccessToken, loginInfo),
				timeout: call(delay, SSO_TTL)
			})

			if (timeout) {
				const e = new Error('Logging in timed out.')
				e.name = 'ssoTimeout'
				throw e
			} else if (response.error) {
				if (response.error.appUpdateRequired) {
					yield outOfDateAlert()
					const appUpdateError = new Error('App update required.')
					throw appUpdateError
				} else {
					logger.log(response)
					throw response.error
				}
			} else {
				// Successfully logged in
				yield auth.storeUserCreds(username, passwordEncrypted)
				yield auth.storeAccessToken(response.access_token)

				// Set up user profile
				const newProfile = {
					username,
					pid: response.pid,
					classifications: { student: Boolean(response.pid) }
				}

				yield put({ type: 'LOGGED_IN', profile: newProfile })
				yield put({ type: 'LOG_IN_SUCCESS' })
				yield put({ type: 'TOGGLE_AUTHENTICATED_CARDS' })

				// Clears any potential errors from being
				// unable to automatically reauthorize a user
				yield put({ type: 'AUTH_HTTP_SUCCESS' })

				yield call(queryUserData)
			}
		} catch (error) {
			logger.trackException(error)
			yield put({ type: 'LOG_IN_FAILURE', error })
		}
	}
}

function* doTokenRefresh() {
	try {
		yield refreshTokenRequest()
	} catch (error) {
		const invalidCredsMessage = 'There was a problem with your credentials.'
		if (error.message === invalidCredsMessage) {
			// This means that the authentication server rejected our
			// saved credentials. Did the user's password change? Only retry
			// once, and if it fails again, force a sign-out.
			try {
				// Try once more with a delay just to be sure
				yield delay(SSO_IDP_ERROR_RETRY_INCREMENT)
				yield refreshTokenRequest()
			} catch (secondError) {
				if (secondError.message === invalidCredsMessage) {
					// We tried again and got the same error
					yield put({ type: 'PANIC_LOG_OUT' })
					const invalidCredsError = new Error('InvalidCreds Error')
					logger.trackException(invalidCredsError)
					yield call(clearUserData)
				}
			}
		}
	}
}

function* refreshTokenRequest() {
	const { isLoggedIn } = yield select(userState)
	if (!isLoggedIn) {
		const e = new Error('Not signed in.')
		throw e
	}

	// Get username and password from keystore
	const {
		username,
		password
	} = yield auth.retrieveUserCreds()
	const loginInfo = auth.encryptStringWithBase64(`${username}:${password}`)
	const response = yield call(ssoService.retrieveAccessToken, loginInfo)

	if (response.error && response.error.appUpdateRequired) {
		yield outOfDateAlert()
	}
	else if (response.access_token) {
		yield auth.storeAccessToken(response.access_token)
		// Clears any potential errors from being
		// unable to automatically reauthorize a user
		yield put({ type: 'AUTH_HTTP_SUCCESS' })
	} else {
		const e = new Error('No access token returned.')
		throw e
	}
}

function* doTimeOut() {
	const error = new Error('Logging in timed out.')
	yield put({ type: 'LOG_IN_FAILURE', error })
}

function* doLogout(action) {
	yield put({ type: 'LOGGED_OUT' })
	yield call(clearUserData)
}

function* queryUserData() {
	// perform first data calls when user is logged in
	yield put({ type: 'UPDATE_SCHEDULE' })
}

function* clearUserData() {
	yield put({ type: 'TOGGLE_AUTHENTICATED_CARDS' })
	yield auth.destroyUserCreds()
	yield auth.destroyAccessToken()
	yield put({ type: 'CLEAR_SCHEDULE_DATA' })
}

function* activateDemoAccount(demoUsername, demoPassword) {
	yield put({ type: 'LOG_IN_REQUEST' })
	yield put({ type: 'ACTIVATE_STUDENT_DEMO_ACCOUNT' })
	yield call(delay, 750)

	// Successfully logged in
	yield auth.storeUserCreds(demoUsername, demoPassword)

	// Set up user profile
	const newProfile = {
		username: 'Student Demo',
		pid: 'fakepid',
		classifications: { student: true }
	}

	yield put({ type: 'LOGGED_IN', profile: newProfile })
	yield put({ type: 'LOG_IN_SUCCESS' })
	yield put({ type: 'TOGGLE_AUTHENTICATED_CARDS' })

	// Clears any potential errors from being
	// unable to automatically reauthorize a user
	yield put({ type: 'AUTH_HTTP_SUCCESS' })

	yield call(queryUserData)
}

function* outOfDateAlert() {
	yield put({ type: 'APP_UPDATE_REQUIRED' })

	Alert.alert(
		'App Update Required',
		'If you would like to log in, please update the app.',
		[
			{
				text: 'OK',
				style: 'cancel'
			}
		],
		{ cancelable: false }
	)
}

function* userSaga() {
	yield takeLatest('USER_LOGIN', doLogin)
	yield takeLatest('USER_LOGOUT', doLogout)
	yield takeLatest('USER_LOGIN_TIMEOUT', doTimeOut)
	yield takeLatest('USER_TOKEN_REFRESH', doTokenRefresh)
}

export default userSaga
