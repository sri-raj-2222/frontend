import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import SignIn from "./pages/SignIn"
import Dashboard from "./pages/Dashboard"
import Onboarding from "./pages/Onboarding"
import DirectExchange from "./pages/DirectExchange"
import Chat from "./pages/Chat"
import Profile from "./pages/Profile"
import BroadcastClass from "./pages/BroadcastClass"
import BroadcastChat from "./pages/BroadcastChat"
import WorkFeed from "./pages/WorkFeed"
import WorkPost from "./pages/WorkPost"
import WorkDetail from "./pages/WorkDetail"
import WorkRoom from "./pages/WorkRoom"
import ProjectComposite from "./pages/ProjectComposite"
import TutorDiscovery from "./pages/TutorDiscovery"
import MyActivity from "./pages/MyActivity"
import AvailableMatches from "./pages/AvailableMatches"
import AdminDashboard from "./pages/admin/AdminDashboard"
import AdminLogin from "./pages/admin/AdminLogin"
import AdminRoute from "./components/AdminRoute"
import BannedScreen from "./pages/BannedScreen"
import { useAuth } from "@/contexts/auth-context"

function App() {
  
  const { banInfo, logout } = useAuth()

  // Global ban gate â€” if the current user is banned, show BannedScreen
  if (banInfo) {
    return (
      <BannedScreen
        type={banInfo.type}
        banExpiresAt={banInfo.ban_expires_at}
        onLogout={logout}
      />
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/tasks/direct" element={<DirectExchange />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/broadcast" element={<BroadcastClass />} />
      <Route path="/broadcast-chat/:broadcastId" element={<BroadcastChat />} />
      <Route path="/tasks/project" element={<WorkFeed />} />
      <Route path="/tasks/project/mine" element={<ProjectComposite />} />
      <Route path="/tasks/project/post" element={<WorkPost />} />
      <Route path="/tasks/project/:projectId" element={<WorkDetail />} />
      <Route path="/tasks/project/:projectId/room" element={<WorkRoom />} />
      <Route path="/tutors" element={<TutorDiscovery />} />
      <Route path="/activity" element={<MyActivity />} />
      <Route path="/tasks/one-to-one/matches" element={<AvailableMatches />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
    </Routes>
  )
}

export default App
