import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Switch, Platform, Image,
} from 'react-native';

// ─── Platform-safe alert ─────────────────────
function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
}

// ─── API Base URL ────────────────────────────
function getApiBase(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://localhost:8000';
}
const API_BASE = getApiBase();

// ─── Fetch wrappers ─────────────────────────
async function apiPost(path: string, body?: any, token?: string | null) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function apiGet(path: string, token?: string | null) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPut(path: string, body: any, token?: string | null) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT', headers, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Colors ──────────────────────────────────
const C = {
  bg: '#0A0A0F',
  surface: '#14141F',
  surfaceHover: '#1C1C2E',
  border: '#2A2A3D',
  primary: '#6C63FF',
  primaryDark: '#5A52E0',
  secondary: '#00D9A6',
  accent: '#FF6B6B',
  text: '#FFFFFF',
  textSec: '#A0A0B8',
  textMuted: '#6B6B80',
  protein: '#FF6B6B',
  carbs: '#FFB547',
  fat: '#6C63FF',
  error: '#FF4757',
  success: '#00D9A6',
  warning: '#FFB547',
};

// ─── Types ───────────────────────────────────
type UserData = {
  id: string;
  email: string;
  full_name: string;
  fitness_goal?: string;
  experience_level?: string;
  weight_kg?: number;
  height_cm?: number;
  equipment_access?: string;
  weak_points?: string[];
  onboarding_completed?: boolean;
};

// ════════════════════════════════════════════════
// SCREEN: LOGIN
// ════════════════════════════════════════════════

function LoginScreen({ onLogin, onNavigate }: { onLogin: (user: UserData, token: string) => void; onNavigate: (s: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      showAlert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/api/v1/auth/login', { email, password });
      const user: UserData = {
        id: data.user_id,
        email: data.email || email,
        full_name: data.full_name || email.split('@')[0],
      };
      onLogin(user, data.access_token);
    } catch (err: any) {
      showAlert('Login Failed', err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={st.screenCenter}>
      <View style={st.formWrap}>
        <Text style={st.brandTitle}>{'💪 GymBud'}</Text>
        <Text style={st.brandSub}>Your AI-Powered Fitness Coach</Text>
        <TextInput style={st.input} placeholder="Email" placeholderTextColor={C.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={st.input} placeholder="Password" placeholderTextColor={C.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={[st.btn, loading && st.btnOff]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={C.text} /> : <Text style={st.btnTxt}>Log In</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('signup')}>
          <Text style={st.link}>Don't have an account? <Text style={{ color: C.primary, fontWeight: '700' }}>Sign Up</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════
// SCREEN: SIGNUP
// ════════════════════════════════════════════════

function SignupScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      showAlert('Error', 'Fill in all fields');
      return;
    }
    if (password.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/api/v1/auth/signup', { email, password, full_name: fullName });
      showAlert('Account Created!', 'You can now log in.');
      onNavigate('login');
    } catch (err: any) {
      showAlert('Signup Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={st.screenCenter}>
      <View style={st.formWrap}>
        <Text style={st.h2}>Create Account</Text>
        <Text style={st.sub}>Start your transformation journey</Text>
        <TextInput style={st.input} placeholder="Full Name" placeholderTextColor={C.textMuted} value={fullName} onChangeText={setFullName} />
        <TextInput style={st.input} placeholder="Email" placeholderTextColor={C.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={st.input} placeholder="Password (6+ chars)" placeholderTextColor={C.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={[st.btn, loading && st.btnOff]} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color={C.text} /> : <Text style={st.btnTxt}>Sign Up</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('login')}>
          <Text style={st.link}>Already have an account? <Text style={{ color: C.primary, fontWeight: '700' }}>Log In</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════
// SCREEN: ONBOARDING
// ════════════════════════════════════════════════

const GOALS = ['muscle_gain', 'fat_loss', 'recomp', 'strength', 'endurance'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT = ['full_gym', 'home_basic', 'home_advanced', 'bodyweight'];
const WEAK_POINTS = ['chest', 'upper_chest', 'lower_chest', 'back', 'lats', 'rear_delts', 'shoulders', 'arms', 'biceps', 'triceps', 'legs', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'core'];

function OnboardingScreen({ user, token, onComplete }: { user: UserData; token: string; onComplete: (u: UserData) => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('muscle_gain');
  const [level, setLevel] = useState('intermediate');
  const [equip, setEquip] = useState('full_gym');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [gender, setGender] = useState('male');
  const [selectedWP, setSelectedWP] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleWP(wp: string) {
    setSelectedWP(prev => prev.includes(wp) ? prev.filter(w => w !== wp) : [...prev, wp]);
  }

  async function handleComplete() {
    setLoading(true);
    try {
      await apiPut(`/api/v1/users/me?user_id=${user.id}`, {
        fitness_goal: goal,
        experience_level: level,
        equipment_access: equip,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        gender,
        weak_points: selectedWP,
        onboarding_completed: true,
      }, token);
      onComplete({
        ...user,
        fitness_goal: goal,
        experience_level: level,
        equipment_access: equip,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        weak_points: selectedWP,
        onboarding_completed: true,
      });
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    // Step 0: Goal
    <View key="goal">
      <Text style={st.h2}>{'🎯'} What's your goal?</Text>
      <Text style={[st.sub, { marginBottom: 20 }]}>This shapes your entire program</Text>
      {GOALS.map(g => (
        <TouchableOpacity key={g} style={[st.selectRow, goal === g && st.selectRowOn]} onPress={() => setGoal(g)}>
          <Text style={[st.body, goal === g && { color: C.primary, fontWeight: '700' }]}>{g.replace(/_/g, ' ')}</Text>
        </TouchableOpacity>
      ))}
    </View>,
    // Step 1: Level & Equipment
    <View key="level">
      <Text style={st.h2}>{'💪'} Experience & Equipment</Text>
      <Text style={[st.cardLabel, { marginTop: 16 }]}>EXPERIENCE LEVEL</Text>
      <Chips options={LEVELS} selected={level} onSelect={setLevel} />
      <Text style={[st.cardLabel, { marginTop: 20 }]}>EQUIPMENT ACCESS</Text>
      <Chips options={EQUIPMENT} selected={equip} onSelect={setEquip} />
    </View>,
    // Step 2: Body Stats
    <View key="body">
      <Text style={st.h2}>{'📏'} Body Stats</Text>
      <Text style={[st.sub, { marginBottom: 20 }]}>Helps calculate your macros</Text>
      <Text style={[st.cardLabel, { marginTop: 8 }]}>GENDER</Text>
      <Chips options={['male', 'female', 'other']} selected={gender} onSelect={setGender} />
      <TextInput style={[st.input, { marginTop: 16 }]} placeholder="Weight (kg)" placeholderTextColor={C.textMuted} value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" />
      <TextInput style={st.input} placeholder="Height (cm)" placeholderTextColor={C.textMuted} value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" />
    </View>,
    // Step 3: Weak Points
    <View key="wp">
      <Text style={st.h2}>{'🔍'} Weak Points</Text>
      <Text style={[st.sub, { marginBottom: 20 }]}>Select muscles you want to prioritize</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {WEAK_POINTS.map(wp => (
          <TouchableOpacity key={wp} style={[st.chip, selectedWP.includes(wp) && st.chipOn]} onPress={() => toggleWP(wp)}>
            <Text style={[st.chipTxt, selectedWP.includes(wp) && st.chipTxtOn]}>{wp.replace(/_/g, ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>,
  ];

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
      <View style={{ flexDirection: 'row', marginBottom: 24 }}>
        {steps.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2, backgroundColor: i <= step ? C.primary : C.border }} />
        ))}
      </View>
      {steps[step]}
      <View style={{ flexDirection: 'row', marginTop: 32, gap: 12 }}>
        {step > 0 && (
          <TouchableOpacity style={[st.btn, { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]} onPress={() => setStep(step - 1)}>
            <Text style={[st.btnTxt, { color: C.textSec }]}>Back</Text>
          </TouchableOpacity>
        )}
        {step < steps.length - 1 ? (
          <TouchableOpacity style={[st.btn, { flex: 1 }]} onPress={() => setStep(step + 1)}>
            <Text style={st.btnTxt}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[st.btn, { flex: 1, backgroundColor: C.secondary }, loading && st.btnOff]} onPress={handleComplete} disabled={loading}>
            {loading ? <ActivityIndicator color={C.bg} /> : <Text style={[st.btnTxt, { color: C.bg }]}>Complete Setup</Text>}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

// ════════════════════════════════════════════════
// SCREEN: DASHBOARD
// ════════════════════════════════════════════════

function DashboardScreen({ user, token }: { user: UserData; token: string }) {
  const [plan, setPlan] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const firstName = user.full_name?.split(' ')[0] || 'Athlete';

  React.useEffect(() => {
    apiGet(`/api/v1/plans/active?user_id=${user.id}`, token)
      .then((d) => { if (d?.data) setPlan(d.data); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function generatePlan() {
    setGenerating(true);
    try {
      await apiPost('/api/v1/plans/generate', { user_id: user.id }, token);
      const d = await apiGet(`/api/v1/plans/active?user_id=${user.id}`, token);
      if (d?.data) setPlan(d.data);
      showAlert('Done!', 'Your AI plan is ready.');
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setGenerating(false);
    }
  }

  const dayOfWeek = new Date().getDay();
  const todaysWorkout = plan?.plan_json?.days?.find((d: any) => d.day_number === (dayOfWeek === 0 ? 7 : dayOfWeek));

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={st.h1}>Hey, {firstName} {'💪'}</Text>
      <Text style={[st.body, { color: C.textSec, marginBottom: 24 }]}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      {/* Today's Workout Card */}
      <View style={st.card}>
        <Text style={st.cardLabel}>TODAY'S WORKOUT</Text>
        {!loaded ? (
          <ActivityIndicator color={C.primary} />
        ) : todaysWorkout ? (
          <>
            <Text style={st.h3}>{todaysWorkout.day_label}</Text>
            <Text style={[st.body, { color: C.textSec }]}>{todaysWorkout.exercises?.length || 0} exercises • ~{todaysWorkout.estimated_duration_min || 60}min</Text>
            {todaysWorkout.exercises?.slice(0, 3).map((ex: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: C.primary, fontSize: 12, width: 20 }}>{ex.order || i + 1}.</Text>
                <Text style={[st.body, { fontSize: 13, flex: 1 }]}>{ex.exercise_name}</Text>
                <Text style={{ color: C.textMuted, fontSize: 11 }}>{ex.sets}×{ex.rep_range}</Text>
              </View>
            ))}
            {(todaysWorkout.exercises?.length || 0) > 3 && (
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>+{todaysWorkout.exercises.length - 3} more</Text>
            )}
          </>
        ) : plan ? (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 32 }}>{'😌'}</Text>
            <Text style={[st.body, { color: C.secondary, marginTop: 8 }]}>Rest day — recover and grow!</Text>
          </View>
        ) : (
          <>
            <Text style={[st.body, { color: C.textSec, marginBottom: 12 }]}>No plan yet. Let AI create your personalized program!</Text>
            <TouchableOpacity style={[st.btn, generating && st.btnOff]} onPress={generatePlan} disabled={generating}>
              {generating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color={C.text} />
                  <Text style={st.btnTxt}>Generating with AI...</Text>
                </View>
              ) : <Text style={st.btnTxt}>{'🤖'} Generate My Plan</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Macro Targets */}
      {plan?.macro_plan_json && (
        <View style={st.card}>
          <Text style={st.cardLabel}>DAILY MACRO TARGETS</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
            {[
              { l: 'Calories', v: plan.macro_plan_json.daily_calories, c: C.secondary },
              { l: 'Protein', v: (plan.macro_plan_json.protein_g || 0) + 'g', c: C.protein },
              { l: 'Carbs', v: (plan.macro_plan_json.carbs_g || 0) + 'g', c: C.carbs },
              { l: 'Fat', v: (plan.macro_plan_json.fat_g || 0) + 'g', c: C.fat },
            ].map((m) => (
              <View key={m.l} style={{ alignItems: 'center' }}>
                <View style={[st.ring, { borderColor: m.c }]}><Text style={[st.ringVal, { color: m.c }]}>{m.v}</Text></View>
                <Text style={{ color: C.textSec, fontSize: 11, marginTop: 4 }}>{m.l}</Text>
              </View>
            ))}
          </View>
          {plan.macro_plan_json.caloric_strategy && (
            <Text style={{ color: C.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12, textTransform: 'capitalize' }}>
              Strategy: {plan.macro_plan_json.caloric_strategy}
            </Text>
          )}
        </View>
      )}

      {/* Weekly Split */}
      {plan?.plan_json?.days && (
        <View style={st.card}>
          <Text style={st.cardLabel}>WEEKLY SPLIT — {plan.plan_json.split_type || 'Custom'}</Text>
          {plan.plan_json.days.map((d: any) => (
            <View key={d.day_number} style={st.dayRow}>
              <Text style={{ color: d.day_number === (dayOfWeek === 0 ? 7 : dayOfWeek) ? C.primary : C.text, fontWeight: '600', flex: 1, fontSize: 14 }}>
                {d.day_number === (dayOfWeek === 0 ? 7 : dayOfWeek) ? '▶ ' : ''}{d.day_label}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{d.exercises?.length || 0} ex</Text>
            </View>
          ))}
        </View>
      )}

      {/* Coach's Focus */}
      {plan?.coaching_notes?.weekly_focus && (
        <View style={st.card}>
          <Text style={st.cardLabel}>{'🧠'} COACH'S FOCUS</Text>
          <Text style={[st.body, { color: C.secondary, fontStyle: 'italic', lineHeight: 22 }]}>"{plan.coaching_notes.weekly_focus}"</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ════════════════════════════════════════════════
// SCREEN: WORKOUT
// ════════════════════════════════════════════════

function WorkoutScreen({ user, token }: { user: UserData; token: string }) {
  const [plan, setPlan] = useState<any>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  React.useEffect(() => {
    apiGet(`/api/v1/plans/active?user_id=${user.id}`, token)
      .then((d) => { if (d?.data) setPlan(d.data); })
      .catch(() => {});
  }, []);

  const days = plan?.plan_json?.days || [];

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={st.h1}>Your Plan</Text>
      <Text style={[st.body, { color: C.primary, marginBottom: 24 }]}>{plan?.plan_json?.split_type || 'No active plan'}</Text>

      {days.length === 0 && (
        <View style={[st.card, { alignItems: 'center' as const }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>{'🏋️'}</Text>
          <Text style={[st.body, { color: C.textMuted, textAlign: 'center' }]}>Generate a plan from the Dashboard first.</Text>
        </View>
      )}

      {days.map((day: any) => (
        <TouchableOpacity key={day.day_number} style={st.card} onPress={() => setExpanded(expanded === day.day_number ? null : day.day_number)} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={st.h3}>{day.day_label}</Text>
            <Text style={{ color: C.textMuted, fontSize: 12 }}>{day.exercises?.length || 0} ex • ~{day.estimated_duration_min || 60}m</Text>
          </View>
          {expanded === day.day_number && day.exercises?.map((ex: any, i: number) => (
            <View key={i} style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
              <Text style={[st.body, { fontWeight: '600' }]}>{ex.weak_point_priority ? '⭐ ' : ''}{ex.exercise_name}</Text>
              <Text style={{ color: C.textSec, fontSize: 12, marginTop: 2 }}>
                {ex.sets}×{ex.rep_range} @ RPE {ex.rpe_target} • Rest {ex.rest_seconds}s • {(ex.technique || 'straight_sets').replace(/_/g, ' ')}
              </Text>
              {ex.notes ? <Text style={{ color: C.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>{ex.notes}</Text> : null}
            </View>
          ))}
          <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>{expanded === day.day_number ? 'Tap to collapse' : 'Tap to expand'}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ════════════════════════════════════════════════
// SCREEN: DAILY LOG
// ════════════════════════════════════════════════

function DailyLogScreen({ user, token }: { user: UserData; token: string }) {
  const [loading, setLoading] = useState(false);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState('good');
  const [waterMl, setWaterMl] = useState('2000');
  const [workoutDone, setWorkoutDone] = useState(false);
  const [rpe, setRpe] = useState('');
  const [energy, setEnergy] = useState('moderate');
  const [mood, setMood] = useState('good');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const result = await apiPost(`/api/v1/daily-log/log?user_id=${user.id}`, {
        sleep_hours: sleepHours ? parseFloat(sleepHours) : undefined,
        sleep_quality: sleepQuality,
        water_ml: parseInt(waterMl) || 0,
        workout_completed: workoutDone,
        overall_rpe: rpe ? parseFloat(rpe) : undefined,
        energy_level: energy,
        mood,
        notes: notes || undefined,
      }, token);
      let msg = 'Daily log saved!';
      if (result?.adaptation_triggered) msg += '\n\n⚡ Your plan was adapted based on your performance!';
      showAlert('Logged! ✅', msg);
      setSubmitted(true);
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <View style={[st.screenCenter, { padding: 32 }]}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>{'✅'}</Text>
        <Text style={st.h2}>Logged for Today!</Text>
        <Text style={[st.body, { color: C.textSec, textAlign: 'center', marginTop: 8 }]}>Great consistency. Keep it up!</Text>
        <TouchableOpacity style={[st.btn, { marginTop: 24, width: '100%', maxWidth: 300 }]} onPress={() => setSubmitted(false)}>
          <Text style={st.btnTxt}>Edit Today's Log</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={st.h1}>Daily Log</Text>
      <Text style={[st.body, { color: C.textSec, marginBottom: 24 }]}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

      <View style={st.card}>
        <Text style={st.h3}>{'😴'} Sleep</Text>
        <TextInput style={st.input} placeholder="Hours slept (e.g. 7.5)" placeholderTextColor={C.textMuted} value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" />
        <Chips options={['poor', 'fair', 'good', 'excellent']} selected={sleepQuality} onSelect={setSleepQuality} />
      </View>

      <View style={st.card}>
        <Text style={st.h3}>{'💧'} Water</Text>
        <TextInput style={st.input} placeholder="Water (ml)" placeholderTextColor={C.textMuted} value={waterMl} onChangeText={setWaterMl} keyboardType="numeric" />
      </View>

      <View style={st.card}>
        <Text style={st.h3}>{'🏋️'} Workout</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[st.body, { color: C.textSec }]}>Completed today?</Text>
          <Switch value={workoutDone} onValueChange={setWorkoutDone} trackColor={{ true: C.primary, false: C.border }} thumbColor={C.text} />
        </View>
        {workoutDone && (
          <>
            <TextInput style={st.input} placeholder="RPE (1-10)" placeholderTextColor={C.textMuted} value={rpe} onChangeText={setRpe} keyboardType="numeric" />
            <Text style={[st.cardLabel, { marginBottom: 4 }]}>ENERGY LEVEL</Text>
            <Chips options={['very_low', 'low', 'moderate', 'high', 'very_high']} selected={energy} onSelect={setEnergy} />
          </>
        )}
      </View>

      <View style={st.card}>
        <Text style={st.h3}>{'🧠'} Mood</Text>
        <Chips options={['poor', 'average', 'good', 'great']} selected={mood} onSelect={setMood} />
      </View>

      <View style={st.card}>
        <Text style={st.h3}>{'📝'} Notes</Text>
        <TextInput style={[st.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="How was your day? Any soreness?" placeholderTextColor={C.textMuted} value={notes} onChangeText={setNotes} multiline />
      </View>

      <TouchableOpacity style={[st.btn, { backgroundColor: C.secondary }, loading && st.btnOff]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={C.bg} /> : <Text style={[st.btnTxt, { color: C.bg }]}>{'✅'} Save Daily Log</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ════════════════════════════════════════════════
// SCREEN: PROFILE
// ════════════════════════════════════════════════

function ProfileScreen({ user, onLogout }: { user: UserData; onLogout: () => void }) {
  const rows = [
    ['Goal', user.fitness_goal?.replace(/_/g, ' ') || '-'],
    ['Experience', user.experience_level || '-'],
    ['Weight', user.weight_kg ? `${user.weight_kg} kg` : '-'],
    ['Height', user.height_cm ? `${user.height_cm} cm` : '-'],
    ['Equipment', user.equipment_access?.replace(/_/g, ' ') || '-'],
    ['Weak Points', user.weak_points?.join(', ') || 'None set'],
  ];

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 16 }}>
        <View style={st.avatar}><Text style={{ fontSize: 32, color: C.text, fontWeight: '800' }}>{user.full_name?.[0]?.toUpperCase() || '?'}</Text></View>
        <Text style={st.h2}>{user.full_name}</Text>
        <Text style={{ color: C.textMuted, fontSize: 13 }}>{user.email}</Text>
      </View>
      <View style={st.card}>
        <Text style={st.cardLabel}>FITNESS PROFILE</Text>
        {rows.map(([label, val], i) => (
          <View key={i} style={[st.profileRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={[st.body, { fontWeight: '600', color: C.textSec, fontSize: 13 }]}>{label}</Text>
            <Text style={[st.body, { textTransform: 'capitalize', fontSize: 13 }]}>{val}</Text>
          </View>
        ))}
      </View>

      <View style={st.card}>
        <Text style={st.cardLabel}>APP INFO</Text>
        <View style={st.profileRow}>
          <Text style={[st.body, { color: C.textSec, fontSize: 13 }]}>Version</Text>
          <Text style={[st.body, { fontSize: 13 }]}>1.0.0 MVP</Text>
        </View>
        <View style={[st.profileRow, { borderBottomWidth: 0 }]}>
          <Text style={[st.body, { color: C.textSec, fontSize: 13 }]}>AI Engine</Text>
          <Text style={[st.body, { fontSize: 13 }]}>Gemini 1.5 Flash</Text>
        </View>
      </View>

      <TouchableOpacity style={st.btnDanger} onPress={() => { if (Platform.OS === 'web') { if (window.confirm('Log out?')) onLogout(); } else onLogout(); }}>
        <Text style={{ color: C.error, fontWeight: '600', fontSize: 15 }}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ════════════════════════════════════════════════
// SHARED: Chips
// ════════════════════════════════════════════════

function Chips({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <TouchableOpacity key={o} style={[st.chip, selected === o && st.chipOn]} onPress={() => onSelect(o)}>
          <Text style={[st.chipTxt, selected === o && st.chipTxtOn]}>{o.replace(/_/g, ' ')}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ════════════════════════════════════════════════
// SHARED: Tab Bar
// ════════════════════════════════════════════════

const TABS = [
  { key: 'dashboard', label: 'Home', icon: '🏠' },
  { key: 'workout', label: 'Workout', icon: '🏋️' },
  { key: 'log', label: 'Log', icon: '📝' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

function TabBar({ active, onPress }: { active: string; onPress: (k: string) => void }) {
  return (
    <View style={st.tabBar}>
      {TABS.map((t) => (
        <TouchableOpacity key={t.key} style={st.tabItem} onPress={() => onPress(t.key)}>
          <Text style={{ fontSize: 20 }}>{t.icon}</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 2, color: active === t.key ? C.primary : C.textMuted }}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ════════════════════════════════════════════════
// APP ROOT
// ════════════════════════════════════════════════

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authScreen, setAuthScreen] = useState('login');
  const [tab, setTab] = useState('dashboard');

  function handleLogin(u: UserData, t: string) {
    setUser(u);
    setToken(t);
  }

  function handleLogout() {
    setUser(null);
    setToken(null);
    setTab('dashboard');
  }

  // Auth screens
  if (!user || !token) {
    if (authScreen === 'signup') return <SignupScreen onNavigate={setAuthScreen} />;
    return <LoginScreen onLogin={handleLogin} onNavigate={setAuthScreen} />;
  }

  // Onboarding (if user hasn't completed it)
  if (!user.onboarding_completed) {
    return (
      <OnboardingScreen
        user={user}
        token={token}
        onComplete={(updated) => setUser(updated)}
      />
    );
  }

  // Main app
  let screen;
  switch (tab) {
    case 'workout': screen = <WorkoutScreen user={user} token={token} />; break;
    case 'log': screen = <DailyLogScreen user={user} token={token} />; break;
    case 'profile': screen = <ProfileScreen user={user} onLogout={handleLogout} />; break;
    default: screen = <DashboardScreen user={user} token={token} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {screen}
      <TabBar active={tab} onPress={setTab} />
    </View>
  );
}

// ════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  screenCenter: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  formWrap: { width: '100%', maxWidth: 400, padding: 32 },
  brandTitle: { fontSize: 42, fontWeight: '800', color: C.primary, textAlign: 'center', marginBottom: 4 },
  brandSub: { fontSize: 15, color: C.textSec, textAlign: 'center', marginBottom: 40 },
  h1: { fontSize: 30, fontWeight: '800', color: C.text, marginBottom: 4 },
  h2: { fontSize: 24, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 4 },
  h3: { fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 8 },
  body: { fontSize: 15, color: C.text },
  sub: { fontSize: 15, color: C.textSec, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, height: 48, paddingHorizontal: 16, color: C.text, fontSize: 15, marginBottom: 12 },
  btn: { backgroundColor: C.primary, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
  btnOff: { opacity: 0.6 },
  btnTxt: { color: C.text, fontSize: 16, fontWeight: '600' },
  btnDanger: { borderWidth: 1, borderColor: C.error, borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  link: { color: C.textSec, fontSize: 15, textAlign: 'center' },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  cardLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 13, color: C.textSec, textTransform: 'capitalize' },
  chipTxtOn: { color: C.text, fontWeight: '600' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  ring: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  ringVal: { fontSize: 13, fontWeight: '700' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  selectRow: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  selectRowOn: { borderColor: C.primary, backgroundColor: `${C.primary}15` },
  tabBar: { flexDirection: 'row', backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, height: 64, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 20 : 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
