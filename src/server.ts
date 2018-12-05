import 'reflect-metadata';
import * as express from 'express';
import 'express-async-errors';
import * as cookieParser from 'cookie-parser';
import * as logger from 'morgan';
import * as mongoose from 'mongoose';
import * as passport from 'passport';
import * as cors from 'cors';
import * as helmet from 'helmet';
import * as yes from 'yes-https';
import { join, resolve } from 'path';
import CONFIG from './config';
import passportMiddleWare, { extractUser } from './middleware/passport';
import { globalError } from './middleware/globalError';
import { router as home } from './routes/home';
import { router as jobs } from './routes/jobs';
import { router as locations } from './routes/locations';
import { router as credentials } from './routes/credentials';
import { router as permissions } from './routes/permissions';
import { router as autocomplete } from './routes/autocomplete';
import { router as reports } from './routes/reports';

import { useExpressServer } from 'routing-controllers';

import { AuthController } from './controllers/auth.controller';
import { SuccessInterceptor } from './interceptors/success.interceptor';
import { currentUserChecker, authorizationChecker } from './middleware/authentication';
import { MemberController } from './controllers/members.controller';
import { EventsController } from './controllers/events.controller';
const { NODE_ENV, DB } = CONFIG;

export default class Server {
	public static async createInstance() {
		const server = new Server();
		await server.mongoSetup();
		return server;
	}
	public app: express.Application;
	public mongoose: typeof mongoose;

	private constructor() {
		this.app = express();
		this.setup();
	}

	private setup(): void {
		this.setupMiddleware();
		// Enable controllers in this.app
		this.app = useExpressServer(this.app, {
			cors: true,
			defaultErrorHandler: false,
			validation: true,
			controllers: [__dirname + '/controllers/*.ts'],
			// controllers: [AuthController, MemberController, EventsController],
			interceptors: [SuccessInterceptor],
			currentUserChecker,
			authorizationChecker
		});
		// Any unhandled errors will be caught in this middleware
		this.app.use(globalError);
		this.setupRoutes();
	}

	private setupMiddleware() {
		this.app.use(helmet());
		if (NODE_ENV === 'production') this.app.use(yes());
		if (NODE_ENV !== 'test')
			NODE_ENV !== 'production' ? this.app.use(logger('dev')) : this.app.use(logger('tiny'));
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));
		this.app.use(cookieParser());
		this.app.use(passportMiddleWare(passport).initialize());
		this.app.use(cors());
		this.app.use(extractUser());
	}

	private setupRoutes() {
		this.app.use('/api', home);
		// this.app.use('/api/auth', auth);
		// this.app.use('/api/members', members);
		// this.app.use('/api/events', events);
		this.app.use('/api/jobs', jobs);
		this.app.use('/api/locations', locations);
		this.app.use('/api/credentials', credentials);
		this.app.use('/api/permissions', permissions);
		this.app.use('/api/autocomplete', autocomplete);
		this.app.use('/api/report', reports);

		// Any unhandled errors will be caught in this middleware
		// this.app.use(globalError);
	}

	private async mongoSetup() {
		try {
			this.mongoose = await mongoose.connect(
				DB,
				{ useNewUrlParser: true }
			);
			this.mongoose.Promise = Promise;
			console.log('Connected to Mongo:', DB);
			return this.mongoose;
		} catch (error) {
			console.error('Error connecting to mongo:', error);
			throw error;
		}
	}
}
