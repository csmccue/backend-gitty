const { Router } = require('express');
const GithubUser = require('../models/GithubUser');
const { exchangeCodeForToken, getGithubProfile } = require('../services/github');
const jwt = require('jsonwebtoken');
const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;

module.exports = Router()
  .get('/login', (req, res) => {
    res.redirect(
      `https://github.com/login/oauth/authorize?client_id=${process.env.GH_CLIENT_ID}&scope=user&redirect_uri=${process.env.GH_REDIRECT_URI}`
    );
  })
  .get('/callback', async (req, res, next) => {
    try {
      // get code from URL Search Params access req.query
      console.log('req.query  ', req.query);
      const { code } = req.query;
      // exchange code for token
      const token = await exchangeCodeForToken(code);
      // use token to get user data
      const { email, login, avatar_url } = await getGithubProfile(token);
      // create a user with data in our own database
      let user = await GithubUser.findByLogin(login);
      // if no user create user
      if (!user) {
        user = await GithubUser.insert({
          login,
          email,
          avatar: avatar_url,
        });
      }
      console.log('user: ', user);
      const payload = jwt.sign({ ...user }, process.env.JWT_SECRET, {
        expiresIn: '1 day',
      });
      res
        // set cookie
        .cookie(process.env.COOKIE_NAME, payload, {
          httpOnly: true,
          maxAge: ONE_DAY_IN_MS,
        })
        // redirect
        .redirect('/api/v1/github/dashboard');
    } catch (e) {
      next(e);
    }
  })



;
