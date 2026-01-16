export function requireAuth(req, res, next) {
  if (req.session?.user) {
    return next();
  }
  return res.redirect('/login');
}

export function attachFlash(req, res, next) {
  res.locals.flash = req.session?.flash || null;
  if (req.session?.flash) {
    delete req.session.flash;
  }
  next();
}

export function setFlash(req, type, message) {
  if (!req.session) {
    return;
  }
  req.session.flash = { type, message };
}
