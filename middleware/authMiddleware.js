const jwt = require('jsonwebtoken');

exports.authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'Kein Token, Autorisierung verweigert.' });
    }

    try {
        // Token-Format ist 'Bearer <token>', wir extrahieren nur den Token-String
        const tokenString = token.split(' ')[1];
        if (!tokenString) {
            return res.status(401).json({ message: 'Ungültiges Token-Format.' });
        }

        const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token ist nicht gültig.' });
    }
};