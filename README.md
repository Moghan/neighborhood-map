# neighborhood-map

This is project 5 in my Front-End Developer Nanodegree program.

The challange:
Develop a single page application featuring a map of your neighborhood or a neighborhood you would like to visit. You will then add functionality to this map including highlighted locations, third-party data about those locations and various ways to browse the content.
Project details is found [HERE](https://classroom.udacity.com/nanodegrees/nd001/parts/00113454014/modules/271165859175462/lessons/2711658591239847/concepts/26906985370923).

The project repo is available at https://github.com/Moghan/neighborhood-map

Have a look at the neighborhood-map sight at http://riots.se/neighborhood-map/

## Getting started
Install the bower-modules listed as dependencies in the bower.json file into the project folder. At the moment they are the following.
* knockout
* bootstrap

(Check out the awesomeness of Bower at https://bower.io/)

Run on a local server using Python.
```bash
  $> cd /path/to/your-project-folder
  $> cd dist
  $> python -m http.server 8080
  ```
and use ngrok to tunnel it out.
``` bash
  $> cd /path/to/your-project-folder
  $> cd dist
  $> ngrok http 8080
  ```

or publish the files to your website.
(some sort of distribution folder is on the way...)




## License
MIT

