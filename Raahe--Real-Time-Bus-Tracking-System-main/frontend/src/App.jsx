import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Homepage from './pages/Homepage'
import UserLogin from './pages/user/UserLogin'
import AutoLogoutWrapper from './components/AutoLogoutWrapper'
import Header from './components/Header'
import { AuthProvider } from './context/AuthContext'
import AdminPage from './pages/admin/AdminPage'
import DriverControl from './pages/driver/DriverControl'
import PassengerNearby from './pages/user/Passenger'
import WomenSafety from './pages/WomenSafety'
import LostFoundPage from './pages/LostFoundPage'
import About from './pages/About'

function AppContent() {


  return (
    <Router>
      <AutoLogoutWrapper/>
      <Header/>
      <Routes>
        <Route path="/" element={<Homepage/>} />
        <Route path="/login" element={<UserLogin/>} />
        <Route path="/admin" element={<AdminPage/>} />
        <Route path="/drivercontrol" element={<DriverControl/>} />
        <Route path="/passenger" element={<PassengerNearby/>} />
        <Route path="/womensafety" element={<WomenSafety/>} />
        <Route path="/lostnfound" element={<LostFoundPage/>} />
        <Route path="/about" element={<About/>} />
      </Routes>
    </Router>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent/>
    </AuthProvider>
  )
}
