import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, dateShort, money, session } from '../../lib';
import { Btn, Card, Field, Header, Loading } from '../../components/ui';

const emptyForm = () => ({ title: '', amount: '', category: 'Fuel', notes: '' });

export default function Reports() {
  const [report, setReport] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const admin = session().user?.role === 'admin';

  const load = async () => {
    try { setReport(await api('/reports')); }
    catch (e: any) { Alert.alert('Reports unavailable', e.message); }
    finally { setLoading(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  if (loading || !report) return <Loading />;

  async function saveExpense() {
    try {
      await api(editingId ? `/expenses/${editingId}` : '/expenses', {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, amount: Number(form.amount) })
      });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await load();
    } catch (e: any) { Alert.alert('Could not save expense', e.message); }
  }

  return <View className="flex-1 bg-canvas px-4 pt-3">
    <Header title="Reports & transactions" subtitle="All team members can view" />
    <View className="flex-row gap-2">
      <Card><Text className="text-gray-500">Money received</Text><Text className="text-xl font-extrabold text-leaf">{money(report.received)}</Text></Card>
      <Card><Text className="text-gray-500">Expenses</Text><Text className="text-xl font-extrabold text-amber">{money(report.expenses)}</Text></Card>
    </View>
    <Card><Text className="text-gray-500">Net balance</Text><Text className="text-3xl font-extrabold text-ink">{money(report.net)}</Text></Card>
    {admin && <View className="mb-3"><Btn title="+ Add expense" onPress={() => { setForm(emptyForm()); setEditingId(null); setShowForm(!showForm); }} /></View>}
    {admin && showForm && <Card><ScrollView className="max-h-96" keyboardShouldPersistTaps="handled">
      <Text className="text-lg font-extrabold text-ink mb-3">{editingId ? 'Edit expense' : 'New expense'}</Text>
      <Field label="Expense" value={form.title} onChangeText={(v: string) => setForm({ ...form, title: v })} />
      <Field label="Category (fuel, wages…)" value={form.category} onChangeText={(v: string) => setForm({ ...form, category: v })} />
      <Field label="Amount (₹)" keyboardType="decimal-pad" value={form.amount} onChangeText={(v: string) => setForm({ ...form, amount: v })} />
      <Field label="Notes" value={form.notes} onChangeText={(v: string) => setForm({ ...form, notes: v })} />
      <Btn title={editingId ? 'Save expense changes' : 'Save expense'} onPress={saveExpense} />
    </ScrollView></Card>}
    <Text className="text-xl font-extrabold text-ink mb-2">Expense history</Text>
    <FlatList data={report.expensesList} keyExtractor={(e: any) => e._id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      ListEmptyComponent={<Text className="text-gray-500 text-center mt-8">No expenses recorded.</Text>}
      renderItem={({ item: e }: any) => <Card>
        <View className="flex-row justify-between"><Text className="font-bold text-ink">{e.title}</Text><Text className="font-bold text-amber">−{money(e.amount)}</Text></View>
        <Text className="text-gray-500 mt-1">{e.category} · {dateShort(e.date)}{e.by ? ` · ${e.by}` : ''}</Text>
        {admin && <View className="mt-3 self-start"><Btn title="Edit expense" secondary onPress={() => {
          setForm({ title: e.title, amount: String(e.amount), category: e.category, notes: e.notes || '' });
          setEditingId(e._id);
          setShowForm(true);
        }} /></View>}
      </Card>}
    />
  </View>;
}
