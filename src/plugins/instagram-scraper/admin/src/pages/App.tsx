import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from './HomePage';

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="*" element={<div>404 - Not Found</div>} />
    </Routes>
  );
};

export { App };
