import { db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { trackWrite } from './syncStatus';

// Bei aktivierter Offline-Persistenz resolven Firestore-Write-Promises erst
// nach Server-Bestätigung. Lokal ist die Änderung aber sofort wirksam –
// deshalb warten wir offline gar nicht und online höchstens kurz, damit die
// UI nie hängen bleibt. Der Sync-Status wird über trackWrite verfolgt.
function commitWrite(promise) {
  trackWrite(promise);
  promise.catch(err => console.error('Firestore-Sync fehlgeschlagen:', err));
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.resolve();
  }
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(resolve, 2500))
  ]);
}

// Zeigt bei noch nicht synchronisierten Dokumenten einen geschätzten
// Zeitstempel statt null, damit Sortierungen nach createdAt stimmen.
const SNAP_OPTS = { serverTimestamps: 'estimate' };

// ============ USERS ============

export async function getUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data(SNAP_OPTS) }));
}

export async function getUser(userId) {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? { id: snap.id, ...snap.data(SNAP_OPTS) } : null;
}

export async function createUser(username, password, isAdmin = false) {
  const id = username.toLowerCase().replace(/\s+/g, '_');
  await commitWrite(setDoc(doc(db, 'users', id), {
    username,
    password: password || '',
    isAdmin,
    mustSetPassword: !password,
    createdAt: serverTimestamp()
  }));
  return id;
}

export async function updateUser(userId, data) {
  await commitWrite(updateDoc(doc(db, 'users', userId), data));
}

export async function deleteUser(userId) {
  await commitWrite(deleteDoc(doc(db, 'users', userId)));
}

export async function loginUser(username, password) {
  const users = await getUsers();
  const user = users.find(u =>
    u.username.toLowerCase() === username.toLowerCase()
  );
  if (!user) return { success: false, error: 'Benutzer nicht gefunden' };
  if (user.mustSetPassword) {
    return { success: true, user, mustSetPassword: true };
  }
  if (user.password !== password) {
    return { success: false, error: 'Falsches Passwort' };
  }
  return { success: true, user };
}

// ============ VACATIONS ============

export async function getVacations(userId) {
  const snap1 = await getDocs(query(collection(db, 'vacations'), where('userId', '==', userId)));
  const snap2 = await getDocs(query(collection(db, 'vacations'), where('members', 'array-contains', userId)));
  const map = new Map();
  snap1.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data(SNAP_OPTS) }));
  snap2.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data(SNAP_OPTS) }));
  const vacs = Array.from(map.values());
  vacs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return vacs;
}

export async function createVacation(userId, name) {
  const ref = doc(collection(db, 'vacations'));
  await commitWrite(setDoc(ref, {
    userId,
    name,
    inviteCode: generateInviteCode(),
    members: [userId],
    createdAt: serverTimestamp(),
    settings: {
      currency: 'EUR',
      exchangeRates: { EUR: 1 },
      defaultExchangeRate: 'EUR',
      sharedMode: false,
      participants: [],
      visibleFields: {
        date: true,
        time: true,
        category: true,
        amount: true,
        currency: true,
        note: true,
        paidBy: true,
        paidFor: true
      }
    },
    categories: ['Essen', 'Trinken', 'Transport', 'Unterkunft', 'Aktivitäten', 'Shopping', 'Sonstiges'],
    kpis: [],
    charts: []
  }));
  return ref.id;
}

export async function updateVacation(vacationId, data) {
  await commitWrite(updateDoc(doc(db, 'vacations', vacationId), data));
}

export async function deleteVacation(vacationId) {
  const batch = writeBatch(db);
  // Delete all expenses for this vacation
  const expSnap = await getDocs(
    query(collection(db, 'expenses'), where('vacationId', '==', vacationId))
  );
  expSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, 'vacations', vacationId));
  await commitWrite(batch.commit());
}

export async function getVacation(vacationId) {
  const snap = await getDoc(doc(db, 'vacations', vacationId));
  return snap.exists() ? { id: snap.id, ...snap.data(SNAP_OPTS) } : null;
}

// ============ EXPENSES ============

export async function getExpenses(vacationId) {
  const snap = await getDocs(
    query(collection(db, 'expenses'), where('vacationId', '==', vacationId))
  );
  const exps = snap.docs.map(d => ({ id: d.id, ...d.data(SNAP_OPTS) }));
  exps.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return exps;
}

export async function createExpense(vacationId, data) {
  const ref = doc(collection(db, 'expenses'));
  await commitWrite(setDoc(ref, {
    vacationId,
    ...data,
    createdAt: serverTimestamp()
  }));
  return ref.id;
}

export async function updateExpense(expenseId, data) {
  await commitWrite(updateDoc(doc(db, 'expenses', expenseId), data));
}

export async function deleteExpense(expenseId) {
  await commitWrite(deleteDoc(doc(db, 'expenses', expenseId)));
}

// ============ CATEGORIES ============

export async function importCategories(fromVacationId, toVacationId) {
  const fromVac = await getVacation(fromVacationId);
  const toVac = await getVacation(toVacationId);
  if (!fromVac || !toVac) return;
  const merged = [...new Set([...(toVac.categories || []), ...(fromVac.categories || [])])];
  await updateVacation(toVacationId, { categories: merged });
}

// ============ INVITE CODES ============

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function leaveVacation(vacationId, userId) {
  const vacRef = doc(db, 'vacations', vacationId);
  const snap = await getDoc(vacRef);
  if (!snap.exists()) return;
  const vac = snap.data();
  const members = (vac.members || [vac.userId]).filter(m => m !== userId);
  await commitWrite(updateDoc(vacRef, { members }));
}

export async function joinVacation(code, userId) {
  const snap = await getDocs(query(collection(db, 'vacations'), where('inviteCode', '==', code.toUpperCase())));
  if (snap.empty) return { success: false, error: 'Kein Urlaub mit diesem Code gefunden' };
  const vacDoc = snap.docs[0];
  const vac = { id: vacDoc.id, ...vacDoc.data(SNAP_OPTS) };
  const members = vac.members || [vac.userId];
  if (members.includes(userId)) return { success: false, error: 'Du bist bereits in diesem Urlaub' };
  await commitWrite(updateDoc(doc(db, 'vacations', vac.id), { members: [...members, userId] }));
  return { success: true, vacation: vac };
}

// ============ DESTINATIONS ============

export async function getDestinations(vacationId) {
  const snap = await getDocs(
    query(collection(db, 'destinations'), where('vacationId', '==', vacationId))
  );
  const dests = snap.docs.map(d => ({ id: d.id, ...d.data(SNAP_OPTS) }));
  dests.sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.timeFrom || '').localeCompare(b.timeFrom || '');
  });
  return dests;
}

export async function createDestination(vacationId, data) {
  const ref = doc(collection(db, 'destinations'));
  await commitWrite(setDoc(ref, {
    vacationId,
    ...data,
    createdAt: serverTimestamp()
  }));
  return ref.id;
}

export async function updateDestination(destinationId, data) {
  await commitWrite(updateDoc(doc(db, 'destinations', destinationId), data));
}

export async function deleteDestination(destinationId) {
  await commitWrite(deleteDoc(doc(db, 'destinations', destinationId)));
}

// ============ SHARED VACATION CALCULATIONS ============

export function calculateDebts(expenses, participants, payments = []) {
  // Calculate how much each person paid and how much each person owes
  const balances = {};
  participants.forEach(p => { balances[p] = 0; });

  expenses.forEach(exp => {
    if (!exp.paidBy || !exp.paidFor || exp.paidFor.length === 0) return;
    const amount = parseFloat(exp.amount) || 0;
    const rate = parseFloat(exp.exchangeRate) || 1;
    const converted = amount / rate;

    balances[exp.paidBy] = (balances[exp.paidBy] || 0) + converted;
    exp.paidFor.forEach(person => {
      let share;
      if (exp.paidForAmounts && exp.paidForAmounts[person] !== undefined) {
        share = (parseFloat(exp.paidForAmounts[person]) || 0) / rate;
      } else {
        share = converted / exp.paidFor.length;
      }
      if (exp.directlyPaid?.[person]) {
        // Person already settled directly with payer → reduce payer's outstanding credit
        balances[exp.paidBy] = (balances[exp.paidBy] || 0) - share;
      } else {
        balances[person] = (balances[person] || 0) - share;
      }
    });
  });

  // Factor in recorded person-to-person payments
  // "from" paid money → their balance increases (debt reduced)
  // "to" received money → their balance decreases (credit reduced)
  payments.forEach(pay => {
    const amt = parseFloat(pay.amount) || 0;
    if (balances[pay.from] !== undefined) balances[pay.from] += amt;
    if (balances[pay.to] !== undefined) balances[pay.to] -= amt;
  });

  // Simplify debts
  const debtors = [];
  const creditors = [];
  Object.entries(balances).forEach(([person, balance]) => {
    if (balance < -0.01) debtors.push({ person, amount: -balance });
    else if (balance > 0.01) creditors.push({ person, amount: balance });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].person,
        to: creditors[j].person,
        amount: Math.round(amount * 100) / 100
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return { balances, settlements };
}
