import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Support for cloud deployment via environment variable
const API_URL = import.meta.env.VITE_API_URL || '/api-gateway';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const response = await axios.post(`${API_URL}/api/users/login`, { username, password });
        if (response.data.token) {
            localStorage.setItem('user', JSON.stringify(response.data));
            setUser(response.data);
            return true;
        }
        return false;
    };

    const signup = async (username, email, password) => {
        await axios.post(`${API_URL}/api/users/signup`, { username, email, password, role: 'USER' });
        return login(username, password);
    };

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    const getAuthHeader = () => {
        return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, getAuthHeader, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
