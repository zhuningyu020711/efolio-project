<template>
    <div class="card">
      <h2>Admin Panel</h2>
      <p v-if="!isAdmin" class="error">Admins only.</p>
  
      <div v-else class="grid">
        <form class="grid card" @submit.prevent="add" novalidate>
          <h3>Add new item</h3>
  
          <label>Title
            <input class="input" v-model.trim="item.title" required minlength="3" maxlength="80" />
          </label>
  
          <label>Category
            <input class="input" v-model.trim="item.category" required minlength="3" maxlength="40" />
          </label>
  
          <label>Description
            <textarea class="input" rows="2" v-model.trim="item.description" required minlength="10" maxlength="200"></textarea>
          </label>
  
          <button class="btn success">Add item</button>
        </form>
  
        <div class="card">
          <h3>All items</h3>
          <table class="table">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Reviews</th><th>Avg</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="it in items" :key="it.id">
                <td>{{ it.title }}</td>
                <td>{{ it.category }}</td>
                <td>{{ it.reviews.length }}</td>
                <td>{{ avg(it).toFixed(1) }}</td>
                <td><button class="btn danger" @click="del(it.id)">Delete</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { reactive, computed } from 'vue'
  import { useStore } from '../utils/useStore'
  
  const store = useStore()
  const isAdmin = computed(() => store.isAdmin.value)
  const items = computed(() => store.state.items)
  
  const item = reactive({ title:'', category:'', description:'' })
  const avg = (it) => store.avgRating(it)
  
  function add(){
    try{
      store.addItem(item)
      item.title = item.category = item.description = ''
    }catch(e){ alert(e.message) }
  }
  
  function del(id){
    if (confirm('Delete this item?')){
      try{ store.removeItem(id) }catch(e){ alert(e.message) }
    }
  }
  </script>
  
  <style scoped>
  .card{background:var(--panel);border:1px solid #ddd;border-radius:12px;padding:16px;box-shadow:0 4px 10px rgba(0,0,0,.08)}
  .grid{display:grid;gap:12px}
  .input{width:100%;border:1px solid #ccc;background:#fff;color:var(--text);border-radius:8px;padding:10px 12px}
  .btn{border:1px solid #ccc;background:#f0f0f0;color:var(--text);border-radius:8px;padding:10px 14px;cursor:pointer}
  .btn.success{background:var(--accent);color:#fff;border:none}
  .btn.danger{background:var(--danger);color:#fff;border:none}
  .table{width:100%;border-collapse:collapse}
  .table th,.table td{padding:8px;border-bottom:1px solid #ddd;text-align:left}
  .error{color:var(--danger)}
  </style>
  
  