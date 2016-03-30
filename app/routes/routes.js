// app/routes.js
var User = require('../models/user');
var Project = require('../models/project');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var fs = require ('fs');

module.exports = function(app, passport) {

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		res.render('index.ejs'); // load the index.ejs file
	});

	// =====================================
	// LOGIN ===============================
	// =====================================
	// show the login form
	app.get('/login', function(req, res) {
		req.session.email = req.body.email;
		// render the page and pass in any flash data if it exists
		res.render('login.ejs', { message: '' });
	});

	// process the login form
	//app.post('/login', passport.authenticate('local-login', {
	//	successRedirect : '/profile', // redirect to the secure profile section
	//	failureRedirect : '/login', // redirect back to the signup page if there is an error
	//	failureFlash : true // allow flash messages
	//}));
	//
	app.post('/login', function(req, res, done) { // callback with email and password from our form

		// find a user whose email is the same as the forms email
		// we are checking to see if the user trying to login already exists
		User.findOne({'local.email': req.body.email}, function (err, user) {
			// if there are any errors, return the error before anything else
			if (err)
				return done(err);

			// if no user is found, return the message
			if (!user)
				return res.render('login.ejs', { message: 'No User Found' });

			// if the user is found but the password is wrong
			if (!user.validPassword(req.body.password))
				return res.render('login.ejs', { message: 'Oops! Wrong Password' });

			// all is well, return successful user
			if (!user.local.isVerified) {
				console.log(user.local.isVerified);
				return res.render('login.ejs', { message: 'Your Account is Not Verified' });
			}

			// account not verified
			req.session.user = user;
			req.session.email = req.body.email;

			console.log(req.session.email);
			console.log(user.local.isVerified);

			if (user.local.isModified) {
				console.log(user.local.isModified);
				done(null, user);
				return res.redirect('/profile');
			} else {
				console.log(user.local.isModified);
				done(null, user);
				return res.redirect('/completionForm');
			}

		});
	});

	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
	app.get('/signup', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('signup.ejs', {   message: req.flash('signupMessage') });
	});



	// process the signup form
	app.post('/signup', function(req, res, next) {
		var token;
		async.waterfall([
			function(done) {
				crypto.randomBytes(20, function(err, buf) {
					token = buf.toString('hex');
					done(err, token);
				});
			},
			function(token, done) {
				User.findOne({ 'local.email': req.body.email }, function(err, user) {
					if (user) {
						console.log('error');
						return res.render('signup', {message : 'That email is already taken.'} );
						//return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
					}else{
						console.log('done');
						var newUser= new User();

						newUser.local.email		= req.body.email;
						newUser.local.password 	= newUser.generateHash(req.body.password); // use the generateHash function in our user model
						newUser.local.firstName	= req.body.firstName;
						newUser.local.lastName	= req.body.lastName;
						newUser.local.accountConfirmToken = token;

						newUser.save(function(err) {
							done(err, token, user);
						});
					}

				});
			},
			function(token, user, done) {
				var smtpTransport = nodemailer.createTransport('SMTP', {
					service: 'Gmail',
					auth: {
						user: 'idea.bank.fast1@gmail.com',
						pass: 'ideabank123'
					}
				});
				var mailOptions = {
					to: req.body.email,
					from: 'idea.bank.fast@gmail.com',
					subject: 'Account Confirmation',
					text: 'You are receiving this because you created an account on Idea Bank.\n\n' +
					'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
					'http://' + req.headers.host + '/confirm/' + token + '\n\n' +
					'If you did not request this, please ignore this email.\n'
				};
				smtpTransport.sendMail(mailOptions, function(err) {
					req.flash('info', 'An e-mail has been sent to ' + req.body.email + ' with further instructions.');
					done(err, 'done');
				});
			}
		], function(err) {
			if (err) return next(err);
			res.redirect('/login');
		});
	});

	// =====================================
	// PROFILE SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile',  function(req, res) {
		if(!req.session.user) {
			return res.redirect('/login');
		}
		User.findOne({ 'local.email': req.session.email }, function(err, user) {
			if(err) return res.redirect('/login');
			req.session.user = user;
			console.log(user.personal.country);
			Project.find({'email': req.session.email}, function (err, docs){
				console.log(docs);
				res.render('profile.ejs', {
					user : user,
					array: docs,
					length : docs.length// get the user out of session and pass to template
				});
			});
		});

			//console.log(req.session.user.personal.skills);

	});
	app.get('/bankcredentials',  function(req, res) {
		if(!req.session.user) {
			return res.redirect('/login');
		}

		res.render('bankcredentials.ejs', {
			message: '',
			user : req.session.user// get the user out of session and pass to template
		});
	});

	app.post('/bankcredentials', function(req,res){
		return res.render('bankcredentials.ejs', {message: 'Successfully updated!.'});
	});

	app.get('/completionForm',  function(req, res) {
		if(!req.session.user) {
			return res.redirect('/login');
		}

		res.render('completionForm.ejs', {  message: req.flash('signupMessage'), user: req.session.user });
	});

	app.post('/completionForm', function (req, res) {
		console.log(req.session.email);
		User.findOne({'local.email' : req.session.email},function (err, user){
			if(!user) {
				return res.redirect('/login');
			}

			user.personal.email		= req.session.email;
			user.personal.gender    = req.body.gender;
			user.personal.bday      = req.body.bday;
			user.personal.bmonth   	= req.body.bmonth;
			user.personal.byear    	= req.body.byear;
			user.personal.country  	= req.body.country;
			user.personal.state    	= req.body.state;
			user.personal.address  	= req.body.address;
			user.personal.NIC      	= req.body.NIC;
			user.personal.landlineNo = req.body.landlineNo;
			user.personal.mobileNo 	= req.body.mobileNo;
			user.personal.skills 	= req.body.skills;

			user.local.isModified = true;
			user.save(function(err){
				if (err)
					return res.redirect('/login');
				else {
					return res.redirect('/profile');
				}
			});

		});

	});


	app.get('/project',  function(req, res) {
		if(!req.session.user) {
			return res.redirect('/login');
		}

		res.render('project.ejs', {  message: req.flash('signupMessage'), user: req.session.user });
	});
	app.post('/ImageData',
		function(req, res) {
			console.log(req.body);
			var u = new User();
			u.local.prof=req.body.image;
			u.save(function(err,succes){
				if(err)
				{
					console.log("bhund hai bc ");
					res.send("not done!");
				}
				else {
					console.log("done!, image text is: ",req.body.image);
					res.send("done");
				}
			})


		});

	app.get('/ideabank',  function(req, res) {
		if(!req.session.user) {
			return res.redirect('/login');
		}

		res.render('ideabank.ejs', {  project: '', user: req.session.user });
	});

	app.get('/profileForProject/:name',  function(req, res) {
		if(!req.session.user) {
			return res.redirect('/login');
		}
		console.log('i am here in profile of project');
		Project.findOne({ 'name': req.params.name }, function(err, project) {
			if (!project) {
				req.flash('error', 'Project not Found.');
				return res.redirect('/login');
			}

			res.render('ideabank.ejs', { project: project});
		});

	});

	app.post('/project', function (req, res) {
			console.log(req.body.name);
			var newProject = new Project();
			newProject.email	= req.session.email;
			newProject.name 	= req.body.name;
			newProject.type 	= req.body.type;
			newProject.tags = req.body.tags;
			newProject.description = req.body.description;

			newProject.save(function(err){
				if(err) return;
				return res.render('project.ejs', {message: 'Successfully Completed'});
			});
	});

	app.get('/explore',  function(req, res) {

		if(!req.session.user) {
			return res.redirect('/login');
		}

		var projectList = {};
		Project.find({},function(err, project) {


			project.forEach(function(proj){
				projectList[proj._id] = proj;

			});

		});
		console.log(projectList);
			res.render('explore.ejs', {
				message: req.flash('signupMessage'),
				project: projectList,
				user: req.session.user
			});

	});

	app.get('/updateinfo',  function(req, res) {

		if(!req.session.user) {
			return res.redirect('/login');
		}

		res.render('updateinfo.ejs', {  message: req.flash('signupMessage'), user: req.session.user });
	});

	app.post('/updateinfo', function (req, res) {
		console.log(req.session.email);
		User.findOne({'local.email' : req.session.email},function (err, user){
			if(!user) {
				return res.redirect('/login');
			}

			user.personal.email		= req.session.email;

			user.personal.country  	= req.body.country;
			user.personal.state    	= req.body.state;
			user.personal.address  	= req.body.address;
			user.personal.landlineNo = req.body.landlineNo;
			user.personal.mobileNo 	= req.body.mobileNo;
			user.personal.skills 	= req.body.skills;

			user.local.isModified = true;
			user.save(function(err){
				if (err)
					return res.redirect('/login');
				else {
					return res.render('updateinfo.ejs', {message: 'Successfully updated!'});
				}
			});

		});

	});


	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.session.user = false;
		req.logout();
		res.redirect('/');
	});

	var token;

	app.get('/confirm/:token', function(req, res) {
//		User.findOne({ 'local.accountConfirmToken': req.params.token, 'local.accountConfirmExpires': { $gt: Date.now() } }, function(err, user) {
		User.findOne({ 'local.accountConfirmToken': req.params.token }, function(err, user) {
			if (!user) {
				req.flash('error', 'Confirmation token is invalid or has expired.');
				return res.redirect('/login');
			}
			token = req.params.token;
			res.render('confirm.ejs', {user : User});
		});
	});

	app.post('/confirm', function(req, res, next) {
		async.waterfall([
			function(done) {
				User.findOne({ 'local.accountConfirmToken': token }, function(err, user) {
					if (!user) {
						req.flash('error', 'Confirmation token is invalid or has expired.');
						console.log('Not found');
						return res.redirect('/');
					}

					user.local.isVerified = true;

					user.save(function(err) {
						if(err)
							return done(err);
						done(err, user);

					});
				});
			},
			function(user, done) {
				var smtpTransport = nodemailer.createTransport('SMTP', {
					service: 'gmail',
					auth: {
						user: 'idea.bank.fast1@gmail.com',
						pass: 'ideabank123'
					}
				});
				var mailOptions = {
					to: user.local.email,
					from: 'idea.bank.fast1@gmail.com',
					subject: 'Your Account has been verified',
					text: 'Hello,\n\n' +
					'This is a confirmation that the ' + user.local.email + ' has been verified.\n'
				};
				smtpTransport.sendMail(mailOptions, function(err) {
					req.flash('success', 'Success! Your account is verified.');
					done(err);
				});
			}
		], function(err) {
			if(err) {
				console.log(err);
				return next(err);
			}
			res.redirect('/login');
		});
	});


};


// route middleware to make sure
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}

