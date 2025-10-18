<template>
  <section class="admin">
    <div class="panel">
      <h3>Users</h3>
      <p class="muted mini">This list is filled when users login (Firebase or dev-admin). Dev admin: <code>admin@demo.local / admin123</code></p>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Email</th><th>Name</th><th>Role</th><th>User Id</th><th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.email }}</td>
              <td>{{ u.displayName }}</td>
              <td><span class="tag" :class="u.role">{{ u.role }}</span></td>
              <td>{{ u.id }}</td>
              <td>{{ u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-' }}</td>
            </tr>
            <tr v-if="users.length===0"><td colspan="5" class="muted">No user yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h3>Items & Reviews (read-only)</h3>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Title</th><th>Category</th><th>#Reviews</th><th>Average</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in items" :key="it.id">
              <td>{{ it.title }}</td>
              <td>{{ it.category }}</td>
              <td>{{ it.reviews.length }}</td>
              <td>{{ avg(it).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="muted mini">Use the <strong>Reviews</strong> page to add ratings/comments.</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from '../utils/useStore'

const store = useStore()
const users = computed(() => store.state.users || [])
const items = computed(() => store.state.items || [])
const avg = store.avgRating
</script>

<style scoped>
.admin{display:flex;flex-direction:column;gap:12px}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px}
.table-wrap{overflow:auto;border:1px solid #e5e7eb;border-radius:10px}
.tbl{width:100%;border-collapse:separate;border-spacing:0}
.tbl thead th{background:#eef2f7;font-weight:700;border-bottom:1px solid #dce3ea}
.tbl th,.tbl td{padding:10px;border-bottom:1px solid #eef2f7;vertical-align:top}
.muted{color:#6b7280}
.mini{font-size:12px}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#f8fafc;text-transform:capitalize}
.tag.admin{background:#dbeafe;border-color:#93c5fd}
.tag.user{background:#ecfccb;border-color:#bbf7d0}
</style>
