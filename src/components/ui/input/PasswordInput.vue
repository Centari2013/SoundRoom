<template>
  <div class="relative w-full">
    <BaseInput
      :name="name"
      v-bind="inputProps"
      :type="show ? 'text' : 'password'"
      v-model="internalValue"
      placeholder="Enter your password"
    />
    <BaseButton
      variant="naked"
      class="absolute right-1 top-1/2 -translate-y-1/2 !px-2 !py-2 text-muted hover:text-primary"
      @click.prevent="show = !show"
      :aria-label="show ? 'Hide password' : 'Show password'"
    >
      <component :is="show ? EyeOpen : EyeClosed" class="h-5 w-5" />
    </BaseButton>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseInput from './BaseInput.vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import EyeOpen from '@/assets/icons/eyeOpen.svg'
import EyeClosed from '@/assets/icons/eyeClosed.svg'

const props = defineProps({
  modelValue: String,
  name: String,
  // Allow all props that BaseInput supports to be passed through
  id: String,
  placeholder: String,
  autocomplete: {
    type: String,
    default: '', // fallback value, ensures prop exists
  },
  disabled: Boolean,
  error: String,
  label: String,
  required: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const show = ref(false)

const inputProps = computed(() => ({
  ...props,
  type: undefined // override actual `type` via `:type="show ? 'text' : 'password'"`
}))
</script>