
import process from 'process';

import { console, Emitter, isNumber, isObject, isString } from '../extern/base.mjs';
import { ENVIRONMENT                                    } from '../source/ENVIRONMENT.mjs';
import { Request                                        } from '../source/Request.mjs';
import { Server                                         } from '../source/Server.mjs';
import { Session, isSession                             } from '../source/Session.mjs';
import { Settings                                       } from '../source/Settings.mjs';
import { IP                                             } from '../source/parser/IP.mjs';
import { UA                                             } from '../source/parser/UA.mjs';
import { URL                                            } from '../source/parser/URL.mjs';



/*
 * WARNING: This constant is autogenerated by "/stealth/make.mjs build"
 */

export const VERSION = 'X0:2021-11-11';

export const isStealth = function(obj) {
	return Object.prototype.toString.call(obj) === '[object Stealth]';
};

const isRemote = function(payload) {

	if (
		isObject(payload) === true
		&& IP.isIP(payload.host) === true
		&& isNumber(payload.port) === true
	) {
		return true;
	}


	return false;

};

const toMode = function(url) {

	url = URL.isURL(url) ? url : null;


	let mode = {
		domain: null,
		mode:   {
			text:  false,
			image: false,
			audio: false,
			video: false,
			other: false
		}
	};

	if (url !== null) {

		let search = URL.toDomain(url);
		if (search !== null) {

			let modes = this.settings.modes.filter((m) => URL.isDomain(m.domain, search));
			if (modes.length > 1) {

				return modes.sort((a, b) => {
					if (a.domain.length > b.domain.length) return -1;
					if (b.domain.length > a.domain.length) return  1;
					return 0;
				})[0];

			} else if (modes.length === 1) {

				return modes[0];

			} else {

				mode.domain = search;

			}

		}

	}

	return mode;

};

const toUserAgent = function(url) {

	url = URL.isURL(url) ? url : null;


	let useragent = null;
	let platform  = this.settings.useragent || 'stealth';

	if (url !== null) {

		if (platform === 'stealth') {

			useragent = null;

		} else if (platform === 'browser-desktop') {

			useragent = UA.parse(UA.render({
				platform: 'browser',
				system:   'desktop'
			}));

		} else if (platform === 'browser-mobile') {

			useragent = UA.parse(UA.render({
				platform: 'browser',
				system:   'mobile'
			}));

		} else if (platform === 'spider-desktop') {

			useragent = UA.parse(UA.render({
				platform: 'spider',
				system:   'desktop'
			}));

		} else if (platform === 'spider-mobile') {

			useragent = UA.parse(UA.render({
				platform: 'spider',
				system:   'mobile'
			}));

		} else {

			useragent = null;

		}

	}

	return useragent;

};



const Stealth = function(settings) {

	settings = isObject(settings) ? settings : {};


	this._settings = Object.freeze(Object.assign({
		action:  null,
		debug:   false,
		host:    null,
		profile: null
	}, settings));


	console.clear();
	console.log('Stealth: Command-Line Arguments:');
	console.log(this._settings);


	this.interval = null;
	this.requests = [];
	this.server   = new Server({
		action: this._settings.action,
		host:   this._settings.host
	}, this);
	this.settings = new Settings({
		debug:   this._settings.debug,
		profile: this._settings.profile,
		vendor:  ENVIRONMENT.vendor
	});

	this.__state = {
		connected: false
	};


	Emitter.call(this);


	this.on('connect', () => {

		let interval = this.interval;
		if (interval === null) {

			this.interval = setInterval(() => {

				let connections = 0;

				let connection = this.settings.internet.connection;
				if (connection === 'mobile') {
					connections = 2;
				} else if (connection === 'broadband') {
					connections = 8;
				} else if (connection === 'peer') {
					connections = 2;
				} else if (connection === 'tor') {
					connections = 2;
				}

				if (this._settings.debug === true) {
					connections = 1;
				}


				let active = [];

				for (let r = 0; r < this.requests.length; r++) {

					let request = this.requests[r];

					let started = request.toJSON().data['timeline'].find((e) => e.event === '@start') || null;
					if (started !== null) {
						active.push(request);
					} else if (active.length < connections) {
						active.push(request);
						request.start();
					} else if (active.length === connections) {
						break;
					}

				}

			}, 1000);

		}

	});

	this.on('disconnect', () => {

		let interval = this.interval;
		if (interval !== null) {

			clearInterval(interval);
			this.interval = null;

		}

		if (this.requests.length > 0) {

			for (let r = 0, rl = this.requests.length; r < rl; r++) {

				this.requests[r].stop();

				this.requests.splice(r, 1);
				rl--;
				r--;

			}

		}

	});


	process.on('SIGINT', () => {
		this.disconnect();
	});

	process.on('SIGQUIT', () => {
		this.disconnect();
	});

	process.on('SIGABRT', () => {
		this.disconnect();
	});

	process.on('SIGTERM', () => {
		this.disconnect();
	});

	process.on('error', () => {
		this.disconnect();
	});

};


Stealth.isStealth = isStealth;


Stealth.prototype = Object.assign({}, Emitter.prototype, {

	[Symbol.toStringTag]: 'Stealth',

	connect: function() {

		if (this.__state.connected === false) {

			this.server.once('connect', () => {

				this.__state.connected = true;
				this.emit('connect');

			});

			this.server.once('disconnect', () => {

				this.__state.connected = false;
				this.emit('disconnect');

			});

			let result = this.server.connect();
			if (result === true) {
				return true;
			}

		}


		return false;

	},

	destroy: function() {

		if (this.__state.connected === true) {
			return this.disconnect();
		}


		return false;

	},

	disconnect: function() {

		if (this.__state.connected === true) {

			if (this._settings.debug === true) {

				this.server.disconnect();

			} else {

				this.settings.save(true, () => {
					this.server.disconnect();
				});

			}

			return true;

		}


		return false;

	},

	is: function(state) {

		state = isString(state) ? state : null;


		if (state === 'connected') {

			if (this.__state.connected === true) {
				return true;
			}

		}


		return false;

	},

	request: function(url) {

		url = URL.isURL(url) ? url : null;


		if (url !== null) {

			let request = this.requests.find((r) => r.url.link === url.link) || null;
			if (request === null) {

				if (this.settings.internet.connection === 'tor') {
					url.proxy = { host: '127.0.0.1', port: 9050 };
				}

				request = new Request({
					mode: toMode.call(this, url),
					ua:   toUserAgent.call(this, url),
					url:  url
				}, this.server.services);

				request.on('error',    () => this.requests.remove(request));
				request.on('redirect', () => this.requests.remove(request));
				request.on('response', () => this.requests.remove(request));

				this.requests.push(request);

			}

			return request;

		}


		return null;

	},

	track: function(session, remote) {

		session = isSession(session) ? session : null;
		remote  = isRemote(remote)   ? remote  : null;


		if (session !== null) {

			if (this.settings.sessions.includes(session) === false) {
				this.settings.sessions.push(session);
			}

			return session;

		} else if (remote !== null) {

			if (remote.host.ip === '::1') {
				remote.host = IP.parse('127.0.0.1');
			}

			// XXX: Chromium Bug, which leads to "::ffff:127.0.0.2-255" address
			if (remote.host.ip.startsWith('127.0.0.') === true) {
				remote.host = IP.parse('127.0.0.1');
			}

			let host = this.settings.hosts.find((host) => {

				let found = host.hosts.find((h) => h.ip === remote.host.ip) || null;
				if (found !== null) {
					return true;
				}

				return false;

			}) || null;


			let sessions = [];

			if (host !== null) {

				this.settings.sessions.filter((session) => {

					if (session.domain === host.domain) {
						return true;
					}

					return false;

				}).forEach((session) => {
					sessions.push(session);
				});

			} else {

				this.settings.sessions.filter((session) => {

					let found = session.hosts.find((h) => h.ip === remote.host.ip) || null;
					if (found !== null) {
						return true;
					}

					return false;

				}).forEach((session) => {
					sessions.push(session);
				});

			}


			if (sessions.length > 1) {

				session = new Session(this);

				sessions.forEach((other) => {

					Session.merge(session, other);

					if (this.settings.sessions.includes(other) === true) {
						this.settings.sessions.remove(other);
					}

				});

			} else if (sessions.length > 0) {

				session = sessions[0];

			} else {

				session = new Session(this);

			}


			if (host !== null) {

				session.domain = host.domain;

				host.hosts.forEach((ip) => {

					let found = session.hosts.find((h) => h.ip === ip.ip) || null;
					if (found === null) {
						session.hosts.push(ip);
					}

				});

			} else {

				session.domain = remote.host.ip;

				let found = session.hosts.find((h) => h.ip === remote.host.ip) || null;
				if (found === null) {
					session.hosts.push(remote.host);
				}

			}

			if (this.settings.sessions.includes(session) === false) {
				this.settings.sessions.push(session);
			}

			return session;

		} else {

			if (this.settings.sessions.includes(session) === false) {
				this.settings.sessions.push(session);
			}

			return new Session(this);

		}

	}

});


export { Stealth };
