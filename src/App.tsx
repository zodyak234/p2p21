import { SocketProvider } from './context/SocketContext'
import { Lobby } from './components/Lobby'
import { VideoPlayer } from './components/VideoPlayer'
import { ContentSelector } from './components/ContentSelector'
import { Aria2Settings } from './components/Aria2Settings'

function App() {
    return (
        <SocketProvider>
            <div className="min-h-screen bg-gray-900 text-white p-8">
                <h1 className="text-3xl font-bold mb-8 text-center text-blue-400">
                    P2P Video Watch App (Aria2 Edition)
                </h1>

                <div className="max-w-4xl mx-auto space-y-8">
                    <Aria2Settings />
                    <Lobby />
                    <ContentSelector />
                </div>
            </div>
        </SocketProvider>
    )
}

export default App
