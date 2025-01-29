const jwt = require('jsonwebtoken');

exports.authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');



    if (!token) return res.status(401).json({ message: 'No autorizado' });

    try {
        const tokenParts = token.split(" ");
        if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
            return res.status(401).json({ message: 'Formato de token inválido' });
        }

        const decoded = jwt.verify(tokenParts[1], process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.log("Error en JWT:", error); // 👈 Ver qué error se genera
        res.status(401).json({ message: 'Token inválido' });
    }
};
