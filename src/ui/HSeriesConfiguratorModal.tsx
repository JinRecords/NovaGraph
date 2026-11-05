import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { HSeriesCard, HSeriesConfiguration, HSeriesHost } from '../types';
import { t } from '../i18n';
import { Icon } from './Icons';

const FALLBACK_HOSTS: HSeriesHost[] = [
  { id: 'h2', name: 'H2', unit: 2, baseInputCapacity: 4, baseOutputCapacity: 2, image: 'https://img.novastar.show/products/h2.webp', supportsRedundantPower: false },
  { id: 'h5', name: 'H5', unit: 5, baseInputCapacity: 10, baseOutputCapacity: 3, image: 'https://img.novastar.show/products/h5.webp', supportsRedundantPower: true },
  { id: 'h9', name: 'H9', unit: 9, baseInputCapacity: 15, baseOutputCapacity: 5, image: 'https://img.novastar.show/products/h9.webp', supportsRedundantPower: true },
  { id: 'h9_enhanced', name: 'H9 (Enhanced)', unit: 9, baseInputCapacity: 15, baseOutputCapacity: 10, image: 'https://img.novastar.show/products/h9.webp', supportsRedundantPower: true },
  { id: 'h15', name: 'H15', unit: 15, baseInputCapacity: 30, baseOutputCapacity: 10, image: 'https://img.novastar.show/products/h15.webp', supportsRedundantPower: true },
  { id: 'h15_enhanced', name: 'H15 (Enhanced)', unit: 15, baseInputCapacity: 30, baseOutputCapacity: 16, image: 'https://img.novastar.show/products/h15.webp', supportsRedundantPower: true },
  { id: 'h20', name: 'H20', unit: 20, baseInputCapacity: 40, baseOutputCapacity: 20, image: 'https://img.novastar.show/products/h20.webp', supportsRedundantPower: true },
];

const FALLBACK_INPUT_CARDS: HSeriesCard[] = [
  { id: 'h_4xdvi_input_card', name: 'H_4xDVI input card', type: 'input', slots: 1, image: '' },
  { id: 'h_4xhdmi_input_card', name: 'H_4xHDMI input card', type: 'input', slots: 1, image: '' },
  { id: 'h_1xhdmi2_0_1xdp1_2_input_card', name: 'H_1xHDMI2.0+1xDP1.2 input card', type: 'input', slots: 1, image: '' },
  { id: 'h_2xhdmi2_0_input_card', name: 'H_2xHDMI2.0 input card', type: 'input', slots: 1, image: '' },
  { id: 'h_2xdp1_2_input_card', name: 'H_2xDP1.2 input card', type: 'input', slots: 1, image: '' },
  { id: 'h_4x3g_sdi_input_card', name: 'H_4x3G-SDI input card', type: 'input', slots: 1, image: '' },
  { id: 'h_2x12g_sdi_input_card', name: 'H_2x12G-SDI input card', type: 'input', slots: 1, image: '' },
  { id: 'h_1xhdmi2_1_1xdp1_4_input_card', name: 'H_1xHDMI2.1+1xDP1.4 input card', type: 'input', slots: 1, image: '' },
];

const FALLBACK_OUTPUT_CARDS: HSeriesCard[] = [
  { id: 'h_16xrj45_output_card', name: 'H_16xRJ45 sending card', type: 'output', slots: 1, image: '' },
  { id: 'h_20xrj45_output_card', name: 'H_20xRJ45 sending card', type: 'output', slots: 1, image: '' },
  { id: 'h_2xopt_output_card', name: 'H_2xOPT sending card', type: 'output', slots: 1, image: '' },
  { id: 'h_4xhdmi_preview_output_card', name: 'H_4xHDMI preview/output card', type: 'output', slots: 1, image: '' },
];

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
  const allHosts = hosts && hosts.length > 0 ? hosts : FALLBACK_HOSTS;
  const allInputCards = inputCards && inputCards.length > 0 ? inputCards : FALLBACK_INPUT_CARDS;
  const allOutputCards = outputCards && outputCards.length > 0 ? outputCards : FALLBACK_OUTPUT_CARDS;

  const [selectedHostId, setSelectedHostId] = useState<string>(allHosts[0]?.id || 'h2');
  const [inCounts, setInCounts] = useState<Record<string, number>>({});
  const [outCounts, setOutCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');
  const [autoUpgradeMsg, setAutoUpgradeMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentHost = allHosts.find((h) => h.id === selectedHostId) || allHosts[0];

  const calcTotalSlots = (
    inMap: Record<string, number>,
    outMap: Record<string, number>
  ) => {
    const inSlots = Object.entries(inMap).reduce((acc, [id, count]) => {
      const card = allInputCards.find((c) => c.id === id);
      return acc + (card?.slots || 1) * count;
    }, 0);

    const outSlots = Object.entries(outMap).reduce((acc, [id, count]) => {
      const card = allOutputCards.find((c) => c.id === id);
      return acc + (card?.slots || 1) * count;
    }, 0);

    return { inSlots, outSlots };
  };

  const { inSlots: totalInSlots, outSlots: totalOutSlots } = calcTotalSlots(inCounts, outCounts);

  // Feat #1: Auto-select better H product when card slots exceed current host limits
  const findBestHost = (inReq: number, outReq: number) => {
    const compatible = allHosts
      .filter((h) => h.baseInputCapacity >= inReq && h.baseOutputCapacity >= outReq)
      .sort((a, b) => {
        if (a.unit !== b.unit) return a.unit - b.unit;
        return (a.baseInputCapacity + a.baseOutputCapacity) - (b.baseInputCapacity + b.baseOutputCapacity);
      });
    if (compatible.length > 0) return compatible[0];
    // If exceeds all, select the largest host available
    return [...allHosts].sort((a, b) => b.unit - a.unit)[0] || null;
  };

  const selectedHostIdRef = useRef(selectedHostId);
  selectedHostIdRef.current = selectedHostId;

  // Auto-upgrade or downgrade chassis host as cards are added or removed
  useEffect(() => {
    const best = findBestHost(totalInSlots, totalOutSlots);
    if (best && best.id !== selectedHostIdRef.current) {
      setSelectedHostId(best.id);
      setAutoUpgradeMsg(
        `Auto-selected ${best.name} (${best.unit}U) to fit ${totalInSlots} in / ${totalOutSlots} out slots`
      );
    }
  }, [totalInSlots, totalOutSlots]);

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

  const handleApply = () => {
    if (!currentHost) return;
    const config: HSeriesConfiguration = {
      host: currentHost,
      inputCards: allInputCards
        .filter((c) => inCounts[c.id] > 0)
        .map((card) => ({ card, count: inCounts[card.id] })),
      outputCards: allOutputCards
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="ng-field-label" style={{ marginBottom: 0 }}>{t('hSeriesHostSelect')}</label>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Auto-selects optimal model as cards are added
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginTop: '6px' }}>
              {allHosts.map((h) => {
                const isSelected = h.id === selectedHostId;
                const isExceeded = totalInSlots > h.baseInputCapacity || totalOutSlots > h.baseOutputCapacity;
                return (
                  <div
                    key={h.id}
                    className={`ng-host-card ${isSelected ? 'ng-card-selected' : ''}`}
                    onClick={() => {
                      setSelectedHostId(h.id);
                      setAutoUpgradeMsg(null);
                    }}
                    style={{
                      padding: '8px',
                      border: isSelected ? '2px solid #ff6a2b' : isExceeded ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: isSelected ? '#fff7ed' : isExceeded ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      opacity: isExceeded && !isSelected ? 0.75 : 1,
                      position: 'relative',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '12px', color: isSelected ? '#c2410c' : '#1e293b' }}>
                      {h.name}
                    </div>
                    <div style={{ fontSize: '10px', color: isSelected ? '#ea580c' : '#64748b' }}>
                      {h.unit}U ({h.baseInputCapacity} In / {h.baseOutputCapacity} Out)
                    </div>
                    {isSelected && (
                      <div style={{ fontSize: '9px', fontWeight: 700, color: '#ff6a2b', marginTop: '2px' }}>
                        ● Active Model
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slot status summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Input Slots Required</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: totalInSlots > currentHost.baseInputCapacity ? '#dc2626' : '#1e293b' }}>
                  {totalInSlots} / {currentHost?.baseInputCapacity || 4}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Output Slots Required</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: totalOutSlots > currentHost.baseOutputCapacity ? '#dc2626' : '#1e293b' }}>
                  {totalOutSlots} / {currentHost?.baseOutputCapacity || 2}
                </div>
              </div>
            </div>

            {autoUpgradeMsg && (
              <div style={{ fontSize: '11px', color: '#c2410c', background: '#ffedd5', padding: '5px 8px', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚡</span>
                <span>{autoUpgradeMsg}</span>
              </div>
            )}
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
            {(activeTab === 'input' ? allInputCards : allOutputCards).map((card) => {
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
