import { h } from 'preact';
import { useState } from 'preact/hooks';
import { HSeriesCard, HSeriesConfiguration, HSeriesHost } from '../types';
import { t } from '../i18n';
import { Icon } from './Icons';

export function HSeriesConfiguratorModal({
  isOpen,
  onClose,
  hosts,
  inputCards,
  outputCards,
  onAddConfig,
}: {
  isOpen: boolean;
  onClose: () => void;
  hosts: HSeriesHost[];
  inputCards: HSeriesCard[];
  outputCards: HSeriesCard[];
  onAddConfig: (config: HSeriesConfiguration) => void;
}) {
  const [selectedHostId, setSelectedHostId] = useState<string>(hosts[0]?.id || 'h2');
  const [inCounts, setInCounts] = useState<Record<string, number>>({});
  const [outCounts, setOutCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');

  if (!isOpen) return null;

  const currentHost = hosts.find((h) => h.id === selectedHostId) || hosts[0];

  const updateIn = (id: string, delta: number) => {
    setInCounts((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  const updateOut = (id: string, delta: number) => {
    setOutCounts((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  const totalInSlots = Object.entries(inCounts).reduce((acc, [id, count]) => {
    const card = inputCards.find((c) => c.id === id);
    return acc + (card?.slots || 1) * count;
  }, 0);

  const totalOutSlots = Object.entries(outCounts).reduce((acc, [id, count]) => {
    const card = outputCards.find((c) => c.id === id);
    return acc + (card?.slots || 1) * count;
  }, 0);

  const handleApply = () => {
    if (!currentHost) return;
    const config: HSeriesConfiguration = {
      host: currentHost,
      inputCards: inputCards
        .filter((c) => inCounts[c.id] > 0)
        .map((card) => ({ card, count: inCounts[card.id] })),
      outputCards: outputCards
        .filter((c) => outCounts[c.id] > 0)
        .map((card) => ({ card, count: outCounts[card.id] })),
    };
    onAddConfig(config);
    onClose();
  };

  return (
    <div className="ng-modal-backdrop" onClick={onClose}>
      <div className="ng-modal-window" style={{ width: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="ng-modal-header">
          <span>{t('hSeriesModalTitle')}</span>
          <button className="ng-btn-icon" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="ng-modal-body">
          {/* Host Selector */}
          <div>
            <label className="ng-field-label">{t('hSeriesHostSelect')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginTop: '6px' }}>
              {hosts.map((h) => {
                const isSelected = h.id === selectedHostId;
                return (
                  <div
                    key={h.id}
                    onClick={() => setSelectedHostId(h.id)}
                    style={{
                      padding: '8px',
                      border: isSelected ? '2px solid #ff6a2b' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: isSelected ? '#fff7ed' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{h.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{h.unit}U Chassis</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slot status summary */}
          <div style={{ display: 'flex', gap: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Input Slots Required</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                {totalInSlots} / {currentHost?.baseInputCapacity || 4}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Output Slots Required</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                {totalOutSlots} / {currentHost?.baseOutputCapacity || 2}
              </div>
            </div>
          </div>

          {/* Input / Output cards tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            <button
              className={`ng-sidebar-tab-btn ${activeTab === 'input' ? 'active' : ''}`}
              onClick={() => setActiveTab('input')}
            >
              {t('hSeriesInputCards')} ({Object.values(inCounts).reduce((a, b) => a + b, 0)})
            </button>
            <button
              className={`ng-sidebar-tab-btn ${activeTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              {t('hSeriesOutputCards')} ({Object.values(outCounts).reduce((a, b) => a + b, 0)})
            </button>
          </div>

          {/* Card list with counters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {(activeTab === 'input' ? inputCards : outputCards).map((card) => {
              const count = (activeTab === 'input' ? inCounts[card.id] : outCounts[card.id]) || 0;
              return (
                <div
                  key={card.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: count > 0 ? '#fafaf9' : '#ffffff',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{card.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      {card.slots} Slot{card.slots > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="ng-btn-icon"
                      style={{ width: '24px', height: '24px', border: '1px solid #cbd5e1' }}
                      disabled={count === 0}
                      onClick={() => (activeTab === 'input' ? updateIn(card.id, -1) : updateOut(card.id, -1))}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '13px', width: '18px', textAlign: 'center' }}>
                      {count}
                    </span>
                    <button
                      className="ng-btn-icon"
                      style={{ width: '24px', height: '24px', border: '1px solid #cbd5e1' }}
                      onClick={() => (activeTab === 'input' ? updateIn(card.id, 1) : updateOut(card.id, 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ng-modal-footer">
          <button className="ng-btn ng-btn-secondary" onClick={onClose}>
            {t('close')}
          </button>
          <button className="ng-btn ng-btn-accent" onClick={handleApply}>
            {t('hSeriesAddGroup')}
          </button>
        </div>
      </div>
    </div>
  );
}

