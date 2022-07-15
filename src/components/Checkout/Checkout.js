import CartContext from '../../context/CartContext';
import { addDoc, collection, writeBatch, getDocs, query, where, documentId } from 'firebase/firestore'
import { db } from '../../services/firebase/index'
import { useContext, useEffect, useState } from 'react';

const Checkout = () => {

    const { cart, clearCart, getTotalPrice, totalQuantity } = useContext(CartContext);

    const[name, setName] = useState("");
    const[email, setEmail] = useState("");
    const[phone, setPhone] = useState("");
    const[adress, setAdress] = useState("");
    const[submit, isSubmit] = useState(false);
    const[id, setId] = useState("");
    const[stepCheckout, setStepCheckout] = useState();

    const total = getTotalPrice();

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("El formulario se ha cargado con éxito")
        console.log(name, email, phone, adress);
        handleCreateOrder();
    }

    const handleCreateOrder = () => {

        const date = new Date();

        const fecha = `${date.getDate()}/${date.getMonth()}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`

        const order = {
            buyer: {
                name,
                email,
                phone,
                adress,
                fecha
            },
            items: cart,
            total: total
        }

        const batch = writeBatch(db)

        const ids = cart.map(prod => prod.id)

        const outOfStock = []

        const collectionRef = collection(db, 'products')

        getDocs(query(collectionRef, where(documentId(), 'in', ids)))
            .then(response => {
                response.docs.forEach(doc => {
                    const dataDoc = doc.data();

                    const prod = cart.find(prod => prod.id === doc.id);
                    const prodQuantity = prod.quantity;

                    (dataDoc.stock >= prodQuantity)? 
                        batch.update(doc.ref, { stock: dataDoc.stock - prodQuantity })
                        :
                        outOfStock.push({ id: doc.id, ...dataDoc}) 
                })
            }).then(() => {
                if(outOfStock.length === 0) {
                    const collectionRef = collection(db, 'orders');
                    return addDoc(collectionRef, order);
                } else {
                    return Promise.reject({ type: 'out_of_stock', products: outOfStock });
                }
            }).then(({ id }) => {
                batch.commit();
                isSubmit(true);
                clearCart();
                setId(id);
                console.log(`Su orden se genero correctamente. El id de su orden es: ${id}`);
            }).catch(error => {
                (error.type === 'out_of_stock')?
                    window.location = '/cart'
                    :
                    console.log(error)
            })
    }

    useEffect(() => {
        setStepCheckout(
            <form onSubmit={handleSubmit}>
                    <label htmlFor='name'>Nombre completo:</label>
                    <input 
                        type='text' 
                        id='name' 
                        required
                        onChange={(e) => setName(e.target.value)}
                        />
                    <label htmlFor='email'>Email:</label>
                    <input 
                        type='text' 
                        id='email' 
                        required
                        onChange={(e) => setEmail(e.target.value)}
                        />
                    <label htmlFor='phone'>Número de celular:</label>
                    <input 
                        type='number' 
                        id='phone' 
                        required
                        onChange={(e) => setPhone(e.target.value)}
                        />
                    <label htmlFor='adress'>Dirección:</label>
                    <input 
                        type='text' 
                        id='adress' 
                        required
                        onChange={(e) => setAdress(e.target.value)}
                        />
                    <input type='submit' value='Enviar'/>
            </form>
        )
    }, [name, email, phone, adress])

    useEffect(() => {
            submit && setStepCheckout(
                <>
                    <span>Su compra fue procesada con éxito</span>
                    <br/>
                    <span>{`Su número de orden es: ${id}`}</span>
                </>
            )
    }, [submit])

    return(
        <main className='checkout'>
            {stepCheckout}
        </main>
    )
}

export default Checkout;