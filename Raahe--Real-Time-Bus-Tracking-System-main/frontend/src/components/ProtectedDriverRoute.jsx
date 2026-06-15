import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedDriverRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'driver') return <Navigate to="/unauthorized" replace />;
  return children;
}
