const jwt = require("jsonwebtoken");

const protegerRuta = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ mensaje: "Acceso denegado: no estas autorizado." });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET,
    (err, usuarioDecodificado) => {
      if (err) {
        return res.status(403).json({ mensaje: "Token invalido o expirado." });
      }

      req.user = usuarioDecodificado;
      return next();
    }
  );
};

const permitirRol = (rolRequerido) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== rolRequerido) {
      return res
        .status(403)
        .json({ mensaje: "No tienes permisos para esta ruta." });
    }

    return next();
  };
};

module.exports = { protegerRuta, permitirRol };
