import React, { useEffect, useState, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { listOffers, createOfferApi, updateOfferApi, deleteOfferApi } from '../api/api';

const initialForm = {
    title: '',
    type: 'conditional',
    condition: { minTickets: 3, code: '' },
    discountType: 'percentage',
    discountValue: 10,
    isActive: true,
};

const OffersAdmin = () => {
    const { user } = useContext(UserContext);
    const isAdmin = user?.role === 'admin';
    const [offers, setOffers] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadOffers = async () => {
        setLoading(true); setError('');
        try {
            const res = await listOffers();
            setOffers(res.data || []);
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadOffers(); }, []);

    const onSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError('');
        try {
            const payload = {
                title: form.title,
                type: form.type,
                condition: form.type === 'conditional' ? { minTickets: Number(form.condition.minTickets || 0) } : { code: String(form.condition.code || '').toUpperCase() },
                discountType: form.discountType,
                discountValue: Number(form.discountValue),
                isActive: Boolean(form.isActive),
            };
            if (editingId) {
                await updateOfferApi(editingId, payload);
            } else {
                await createOfferApi(payload);
            }
            setForm(initialForm);
            setEditingId(null);
            await loadOffers();
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    };

    const onEdit = (offer) => {
        setEditingId(offer._id);
        setForm({
            title: offer.title,
            type: offer.type,
            condition: offer.type === 'conditional' ? { minTickets: offer.condition?.minTickets || 0 } : { code: offer.condition?.code || '' },
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            isActive: offer.isActive,
        });
    };

    const onDelete = async (id) => {
        if (!confirm('Delete this offer?')) return;
        setLoading(true);
        try {
            await deleteOfferApi(id);
            await loadOffers();
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="access-denied">
                <h1>Access Restricted</h1>
                <p>Admin only</p>
            </div>
        );
    }

    return (
        <div className="admin-panel-container">
            <h1>Offers & Promo Codes</h1>
            {error && <div className="error">{error}</div>}

            <form onSubmit={onSubmit} className="offer-form" style={{ marginBottom: 20 }}>
                <div>
                    <label>Title</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                    <label>Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        <option value="conditional">Conditional</option>
                        <option value="promocode">Promo Code</option>
                    </select>
                </div>
                {form.type === 'conditional' ? (
                    <div>
                        <label>Min Tickets</label>
                        <input type="number" min="0" value={form.condition.minTickets}
                               onChange={(e) => setForm({ ...form, condition: { ...form.condition, minTickets: e.target.value } })} />
                    </div>
                ) : (
                    <div>
                        <label>Promo Code</label>
                        <input value={form.condition.code}
                               onChange={(e) => setForm({ ...form, condition: { ...form.condition, code: e.target.value } })} />
                    </div>
                )}
                <div>
                    <label>Discount Type</label>
                    <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                        <option value="percentage">Percentage</option>
                        <option value="flat">Flat</option>
                    </select>
                </div>
                <div>
                    <label>Discount Value</label>
                    <input type="number" min="0" value={form.discountValue}
                           onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
                </div>
                <div>
                    <label>Active</label>
                    <input type="checkbox" checked={form.isActive}
                           onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                </div>
                <button type="submit" disabled={loading}>{editingId ? 'Update' : 'Create'} Offer</button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel</button>}
            </form>

            <table className="offers-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Condition</th>
                        <th>Discount</th>
                        <th>Active</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {offers.map(o => (
                        <tr key={o._id}>
                            <td>{o.title}</td>
                            <td>{o.type}</td>
                            <td>{o.type === 'conditional' ? `minTickets: ${o.condition?.minTickets ?? '-'}` : `code: ${o.condition?.code ?? '-'}`}</td>
                            <td>{o.discountType} {o.discountValue}</td>
                            <td>{o.isActive ? 'Yes' : 'No'}</td>
                            <td>
                                <button onClick={() => onEdit(o)}>Edit</button>
                                <button onClick={() => onDelete(o._id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OffersAdmin;


