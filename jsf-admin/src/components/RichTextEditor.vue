<template>
  <div class="rich-text-editor" :class="{ 'is-disabled': disabled }">
    <Toolbar
      class="rich-text-toolbar"
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="default"
    />
    <Editor
      v-model="innerValue"
      class="rich-text-body"
      :default-config="editorConfig"
      mode="default"
      @on-created="handleCreated"
    />
  </div>
</template>

<script setup>
import { shallowRef, onBeforeUnmount, computed } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请输入商品详情' },
  disabled: { type: Boolean, default: false },
  height: { type: String, default: '320px' }
})

const emit = defineEmits(['update:modelValue'])

const editorRef = shallowRef()

const innerValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const toolbarConfig = {}
const editorConfig = computed(() => ({
  placeholder: props.placeholder,
  readOnly: props.disabled
}))

function handleCreated(editor) {
  editorRef.value = editor
}

onBeforeUnmount(() => {
  editorRef.value?.destroy()
})
</script>

<style scoped>
.rich-text-editor {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.rich-text-toolbar {
  border-bottom: 1px solid #dcdfe6;
}

.rich-text-body {
  height: v-bind(height);
  min-height: 320px;
  overflow-y: hidden;
}

.is-disabled {
  opacity: 0.7;
}
</style>
