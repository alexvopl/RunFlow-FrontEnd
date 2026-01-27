import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Training } from './pages/Training';
import { Community } from './pages/Community';
import { Wars } from './pages/Wars';
import { Profile } from './pages/Profile';
import { Activities } from './pages/Activities';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Training />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/community" element={<Community />} />
          <Route path="/wars" element={<Wars />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
