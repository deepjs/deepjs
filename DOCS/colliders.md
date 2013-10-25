# deep colliders

Provides way to manage fine grained collision when applying to layer together.

## Example

### replace

```javascript

deep({ b:[1,2,3] })
.up({
    b:deep.collider.replace([4,5])
})
.equal({ b:[4,5] })
.log()

```

### array.insertAt

```javascript

deep({ b:[1,2,3] })
.up({
    b:deep.collider.array.insertAt([4,5],2)
})
.equal({ b:[1,2,4,5,3] })
.log()


```
