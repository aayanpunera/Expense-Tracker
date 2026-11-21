import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import QuickAddModal from './QuickAddModal';
import ReceiptScannerModal from './ReceiptScannerModal';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState('expense');
  const [scanReceiptOpen, setScanReceiptOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Global 'N' keyboard shortcut for Quick Add
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setQuickAddType('expense');
        setQuickAddOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenQuickAdd = (type = 'expense') => {
    setQuickAddType(type);
    setQuickAddOpen(true);
  };

  const handleOpenScanReceipt = () => {
    setScanReceiptOpen(true);
  };

  const handleTransactionAdded = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="app-layout">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="app-container">
        <Topbar
          onOpenQuickAdd={handleOpenQuickAdd}
          onOpenScanReceipt={handleOpenScanReceipt}
          toggleMobileMenu={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="main-wrapper">
          <Outlet context={{ onOpenQuickAdd: handleOpenQuickAdd, onOpenScanReceipt: handleOpenScanReceipt, refreshKey }} />
        </main>
      </div>

      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        defaultType={quickAddType}
        onTransactionAdded={handleTransactionAdded}
      />

      <ReceiptScannerModal
        isOpen={scanReceiptOpen}
        onClose={() => setScanReceiptOpen(false)}
        onTransactionAdded={handleTransactionAdded}
      />
    </div>
  );
}
