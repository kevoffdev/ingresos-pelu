'use client';

import React, { useState, useEffect } from 'react';

import loadFromGoogleSheets, { addCutToGoogleSheets, deleteCutFromGoogleSheets, deleteEntireDateFromGoogleSheets } from './api';
import { Header } from './components/header';
import { getLocalISODate,toISO } from './lib/utils';
import { toast } from 'sonner';

interface DayRecord {
  date: string;
  cuts: number[];  // Array con el valor de cada corte
}

const COMMON_PRICES = [10000, 11000, 12000, 13000, 14000, 15000];

export default function Home() {
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const saveRecords = (newRecords: DayRecord[]) => {
    setRecords(newRecords);
  };

  // Agregar corte con valor específico
  const handleAddCut = async (price: number) => {
  if (isSyncing) return;

  setIsSyncing(true);

  const dateToAdd = selectedDate || currentDate;
  const existingRecord = records.find((r) => r.date === dateToAdd);

  let newRecords;
  if (existingRecord) {
    newRecords = records.map((r) =>
      r.date === dateToAdd ? { ...r, cuts: [...r.cuts, price] } : r
    );
  } else {
    newRecords = [...records, { date: dateToAdd, cuts: [price] }];
  }

  try {
    await addCutToGoogleSheets(dateToAdd, price);
    saveRecords(newRecords);
    setCustomPrice('');
    
    toast.success('Corte agregado', {
    description: `+$${price.toLocaleString()}`,
  });
  } catch (error) {
    console.error('Failed to add cut', error);

    toast.error('Error al guardar el corte');

    saveRecords(newRecords); // fallback visual
  } finally {
    setIsSyncing(false); // 🔓 SIEMPRE liberar
  }
};

  // Agregar corte con precio personalizado
  const handleAddCustomCut = () => {
    if (customPrice && !isNaN(Number(customPrice))) {
      handleAddCut(Number(customPrice));
    }
  };

  // Eliminar un corte específico de una fecha
  const handleDeleteCut = async (dateToDelete: string, indexToDelete: number) => {
  if (isSyncing) return;

  setIsSyncing(true);

  const existingRecord = records.find((r) => r.date === dateToDelete);
  if (!existingRecord) {
    setIsSyncing(false);
    return;
  }

  const deletedAmount = existingRecord.cuts[indexToDelete];

  let newRecords;

  try {
    if (existingRecord.cuts.length > 1) {
      newRecords = records.map((r) =>
        r.date === dateToDelete
          ? { ...r, cuts: r.cuts.filter((_, idx) => idx !== indexToDelete) }
          : r
      );

      await deleteCutFromGoogleSheets(dateToDelete, indexToDelete);

      toast.success('Corte eliminado', {
        description: `-$${deletedAmount.toLocaleString()}`,
      });

    } else {
      newRecords = records.filter((r) => r.date !== dateToDelete);

      await deleteEntireDateFromGoogleSheets(dateToDelete);

      toast.success('Día eliminado', {
        description: `-$${deletedAmount.toLocaleString()}`,
      });
    }

    saveRecords(newRecords);
  } catch (error) {
    console.error('Failed to delete cut', error);

    toast.error('Error al eliminar el corte');
  } finally {
    setIsSyncing(false);
  }
};


  // Obtener clientes del mes seleccionado
  const getMonthlyStats = () => {
    const monthRecords = records.filter((r) => r.date.startsWith(selectedMonth));
    
    const totalClients = monthRecords.reduce((sum, r) => sum + (r.cuts?.length || 0), 0);
    const totalIncome = monthRecords.reduce((sum, r) => sum + (r.cuts?.reduce((s, c) => s + c, 0) || 0), 0);
    return { totalClients, totalIncome, days: monthRecords };
  };

  // Obtener clientes del día actual
  const getTodayClients = () => {
    const today = getLocalISODate();
    const todayRecord = records.find((r) => r.date === today);

    return todayRecord?.cuts?.length || 0;
  };

  const stats = getMonthlyStats();
  const todayClients = getTodayClients();

  useEffect(() => {
    const init = async () => {
        const today = getLocalISODate();
        setCurrentDate(today);
        setSelectedMonth(today.substring(0, 7));

      const sheetRecords = await loadFromGoogleSheets();
      const neww = sheetRecords.map((r) => ({
        date: toISO(r.date),
        cuts: r.cuts,
      }));
      setRecords(neww);
    };

    init();
  }, []);

  return (
    <div className="flex justify-center min-h-screen bg-gray-100 py-4">
      <main className="w-full max-w-6xl md:px-6">
        <Header />
        {/* Grid de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          {/* Clientes hoy */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                  Clientes hoy
                </p>
                <p className="text-5xl font-bold text-blue-600 mt-3">
                  {todayClients}
                </p>
              </div>
              <span className="text-6xl opacity-20">👤</span>
            </div>
          </div>

          {/* Clientes mes */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                  Clientes mes
                </p>
                <p className="text-5xl font-bold text-green-600 mt-3">
                  {stats.totalClients}
                </p>
              </div>
              <span className="text-6xl opacity-20">👥</span>
            </div>
          </div>

          {/* Ingresos mes */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                  Ingresos mes
                </p>
                <p className="text-5xl font-bold text-purple-600 mt-3">
                  ${stats.totalIncome.toLocaleString()}
                </p>
              </div>
              <span className="text-6xl opacity-20">💰</span>
            </div>
          </div>
        </div>

        {/* Sección de agregar cliente */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Agregar corte</h2>
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-semibold mb-3">
              Selecciona un día (opcional):
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded p-3 w-full mb-2"
              />
          </div>

          {/* Botones de precios comunes */}
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-semibold mb-3">
              Precios más comunes:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {COMMON_PRICES.map((price) => (
                <button
                  key={price}
                  disabled={isSyncing}
                  onClick={() => handleAddCut(price)}
                  className={`
                    py-3 px-4 rounded-xl font-bold text-lg
                    transition-all duration-200
                    ${
                      isSyncing
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:scale-105'
                    }
                  `}
                  >
                  ${price.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Precio personalizado */}
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-semibold mb-3">
              O ingresa un valor personalizado:
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Ej: 20000"
                className="flex-1 border rounded p-2"
                />
              <button
                onClick={handleAddCustomCut}
                className="cursor-pointer bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                >
                Agregar
              </button>
            </div>
          </div>

          {selectedDate && (
            <p className="text-blue-600 text-sm mt-4">
              📅 Se agregará a: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* Selector de mes */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-3">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Ver estadísticas</h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full md:w-48 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Detalle de días */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">
            Desglose diario ({selectedMonth})
          </h2>

          {stats.days.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="px-4 py-3 text-left font-bold text-gray-700">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-center font-bold text-gray-700">
                      Clientes
                    </th>
                    <th className="px-4 py-3 text-right font-bold text-gray-700">
                      Ingresos
                    </th>
                    <th className="px-4 py-3 text-right font-bold text-gray-700">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.days.map((day, idx) => (
                    <React.Fragment key={day.date}>
                      <tr
                        className="border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => { 
                          if (isSyncing) return;
                          setExpandedDate(expandedDate === day.date ? null : day.date)
                        }}
                      >
                        <td className="px-4 py-3 text-gray-800 font-medium">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString(
                            'es-CO',
                            {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-800 font-semibold">
                          {day.cuts?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800 font-bold text-green-600">
                          ${(day.cuts?.reduce((sum, cut) => sum + cut, 0) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-600">
                            {expandedDate === day.date ? '▼' : '▶'}
                          </span>
                        </td>
                      </tr>
                      {expandedDate === day.date && (
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <td colSpan={4} className="px-4 py-4">
                            <div className="bg-white rounded p-4 border border-gray-200">
                              <h4 className="font-bold text-gray-800 mb-3">Cortes de este día:</h4>
                              <div className="space-y-2">
                                {(day.cuts || []).map((cut, cutIdx) => (
                                  <div key={cutIdx} className="flex justify-between items-center bg-gray-100 p-3 rounded">
                                    <span className="text-gray-800">
                                      Corte {cutIdx + 1}: <span className="font-bold text-green-600">${cut.toLocaleString()}</span>
                                    </span>
                                   <button
                                      disabled={isSyncing}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCut(day.date, cutIdx);
                                      }}
                                      className={`px-3 py-1 rounded text-white
                                        ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}
                                      `}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 pt-3 border-t border-gray-300">
                                <span className="text-gray-700">
                                  Total del día: <span className="font-bold text-lg text-green-600">${(day.cuts?.reduce((sum, cut) => sum + cut, 0) || 0).toLocaleString()}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                Sin registros para {selectedMonth}
              </p>
            </div>
          )}
        </div>
        
      </main>
    </div>
  );
}